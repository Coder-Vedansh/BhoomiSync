from typing import Dict, Any, List, Optional
from app.modules.ai.common.base_model import BaseAIModel


class ModelRegistry:
    """
    AI Model Registry Singleton for BhoomiSync.
    Manages loaded model instances, adapters, versioning, and runtime dispatching.
    """

    _instance = None
    _models: Dict[str, BaseAIModel] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelRegistry, cls).__new__(cls)
            cls._models = {}
        return cls._instance

    @classmethod
    def register_model(cls, model: BaseAIModel) -> None:
        """Registers an AI model instance into the global runtime registry."""
        cls._models[model.model_id] = model

    @classmethod
    def get_model(cls, model_id: str) -> Optional[BaseAIModel]:
        """Retrieves a loaded model instance by ID."""
        return cls._models.get(model_id)

    @classmethod
    def list_models(cls) -> List[Dict[str, Any]]:
        """Lists all registered models with their metadata."""
        return [m.get_model_metadata() for m in cls._models.values()]

    @classmethod
    def clear(cls) -> None:
        """Clears the registry (useful for testing)."""
        cls._models.clear()
