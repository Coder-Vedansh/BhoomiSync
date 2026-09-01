from fastapi import APIRouter, Response, HTTPException
import io

router = APIRouter(prefix="/tiles", tags=["Tile Serving & Raster Cache"])

@router.get("/{survey_id}/{z}/{x}/{y}.png")
def get_map_tile(survey_id: str, z: int, x: int, y: int):
    """
    XYZ Tile Server endpoint for rendering the 2D orthomosaic directly in Leaflet / MapLibre.
    Returns 256x256 RGBA PNG tile. In production with TiTiler / GDAL, slices the GeoTIFF on-the-fly.
    """
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGBA", (256, 256), (34, 197, 94, 30))  # Light emerald tint tile
        draw = ImageDraw.Draw(img)
        draw.rectangle([(0, 0), (255, 255)], outline=(16, 185, 129, 100), width=1)
        
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
