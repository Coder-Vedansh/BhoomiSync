"""
BhoomiSync Processing Engine Client Module
==========================================
This module acts as a PROXY CLIENT for the remote BhoomiSync Processing Engine.

The actual photogrammetry engine (OpenDroneMap + AI) runs on a separate server.
BhoomiSync calls it via HTTP REST API defined by this contract.

Remote Engine URL is configured via: PROCESSING_ENGINE_URL in .env
"""
