# backend/routes/notion.py

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.logging import logger
from db import supabase_client
from routes.auth import get_current_user

router = APIRouter(prefix="/notion", tags=["notion"])


class NotionExportRequest(BaseModel):
    api_key: str
    database_id: str
    report_id: str
    fingerprint_id: str


@router.post("/export", status_code=200)
async def export_to_notion(request: Request, export_req: NotionExportRequest):
    """
    Exports a report to a user-provided Notion Database.
    This creates a new page in the database with the report's metadata.
    """
    auth_user = get_current_user(request)

    # 1. Fetch fingerprint and report data from Supabase
    try:
        fingerprint = supabase_client.get_fingerprint_by_id(export_req.fingerprint_id)
        if not fingerprint:
            raise HTTPException(status_code=404, detail="Fingerprint not found.")
            
        # We need the report to get the originality score.
        # But if the report ID is same as fingerprint ID, it means report saving failed
        # in the check route, or it's a near-duplicate check where report isn't saved.
        # We can fetch report if available, else default to 100 or 0 based on is_duplicate
        report = None
        try:
            reports_data = supabase_client._get_client().table("reports").select("*").eq("id", export_req.report_id).execute()
            if reports_data.data:
                report = reports_data.data[0]
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error fetching data for Notion export: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving record for Notion.")

    file_name = fingerprint.get("file_name", "Unknown File")
    
    # If we got the report, use its score. If not, if it's a near-duplicate, originality is 0, else 100.
    if report and report.get("originality_score") is not None:
        score = report.get("originality_score")
    else:
        score = 0.0 if request.headers.get("x-is-duplicate") == "true" else 100.0

    status = "Highly Original" if score >= 85 else ("Mostly Original" if score >= 65 else "Low Originality / Duplicate")
    
    # 2. Build Notion API Payload
    # Notion API requires specific formatting for Properties.
    # We will assume a very basic default database schema:
    # "Name" (Title), "Originality Score" (Number), "Status" (Rich Text), "Date" (Date)
    # If the user's DB doesn't have these exact property types, it might fail, 
    # but for a dynamic hackathon integration we'll send the basics.
    
    notion_url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {export_req.api_key}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }
    
    payload = {
        "parent": {"database_id": export_req.database_id},
        "properties": {
            "Name": {
                "title": [
                    {
                        "text": {
                            "content": file_name
                        }
                    }
                ]
            },
            "Fingerprint ID": {
                "rich_text": [
                    {
                        "text": {
                            "content": str(export_req.fingerprint_id)
                        }
                    }
                ]
            },
            "Originality Score": {
                "number": score
            },
            "Status": {
                "rich_text": [
                    {
                        "text": {
                            "content": status
                        }
                    }
                ]
            }
        }
    }

    # 3. Make the API Call to Notion
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(notion_url, headers=headers, json=payload, timeout=10.0)
            
            if response.status_code != 200:
                logger.error(f"Notion API error: {response.text}")
                # Sometimes user databases don't have matching schema properties.
                # If so, we'll try a fallback with just the Title property.
                if response.status_code == 400 and "property" in response.text.lower():
                    fallback_payload = {
                        "parent": {"database_id": export_req.database_id},
                        "properties": {
                            "Name": {"title": [{"text": {"content": file_name}}]}
                        },
                        "children": [
                            {
                                "object": "block",
                                "paragraph": {
                                    "rich_text": [
                                        {"text": {"content": f"Fingerprint ID: {export_req.fingerprint_id}\nOriginality Score: {score}%\nStatus: {status}"}}
                                    ]
                                }
                            }
                        ]
                    }
                    fallback_response = await client.post(notion_url, headers=headers, json=fallback_payload, timeout=10.0)
                    if fallback_response.status_code != 200:
                        raise HTTPException(status_code=400, detail=f"Notion API Error: {fallback_response.json().get('message', 'Unknown error')}")
                    return {"success": True, "notion_url": fallback_response.json().get("url")}
                else:
                    raise HTTPException(status_code=400, detail=f"Notion API Error: {response.json().get('message', 'Unknown error')}")
                    
            return {"success": True, "notion_url": response.json().get("url")}
            
        except httpx.RequestError as exc:
            logger.error(f"An error occurred while requesting Notion API: {exc}")
            raise HTTPException(status_code=502, detail="Failed to communicate with Notion API.")
