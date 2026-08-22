from fastapi import Header, HTTPException, Request


async def current_user_oid(
    request: Request,
    x_ms_client_principal_id: str | None = Header(default=None),
) -> str:
    # Container Apps Easy Auth injects this header after Entra authentication.
    if x_ms_client_principal_id:
        return x_ms_client_principal_id
    if request.app.state.settings.demo_mode == "cached":
        return "demo-officer-oid"
    raise HTTPException(status_code=401, detail="Microsoft Entra sign-in is required.")
