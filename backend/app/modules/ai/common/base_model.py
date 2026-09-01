import abc
from typing import Dict, Any, List, Optional


class BaseAIModel(abc.ABC):
    """
    Production Model Abstraction for BhoomiSync AI Intelligence.
    Every machine learning / deep learning model (YOLO, SegFormer, SAM, Mask R-CNN, Siamese ChangeNet)
    must implement this interface to be seamlessly swappable without changing application code.
    """

    def __init__(self, model_id: str, version: str, framework: str = "PyTorch / ONNX / Ultralytics"):
        self.model_id = model_id
        self.version = version
        self.framework = framework
        self.is_loaded = False
        self._metadata: Dict[str, Any] = {}

    @abc.abstractmethod
    def load(self, model_path: Optional[str] = None) -> bool:
        """Loads model weights, configuration, or initializes inference runtime."""
        pass

    @abc.abstractmethod
    def validate_input(self, inputs: Dict[str, Any]) -> bool:
        """Validates that all required sensor inputs and coordinate frames are present."""
        pass

    @abc.abstractmethod
    def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Executes inference on preprocessed multi-sensor tensor/feature arrays."""
        pass

    @abc.abstractmethod
    def postprocess(self, raw_outputs: Any, spatial_context: Dict[str, Any]) -> Dict[str, Any]:
        """Transforms raw model tensors into georeferenced GeoJSON polygons with confidence scores."""
        pass

    def get_model_metadata(self) -> Dict[str, Any]:
        """Returns model registry metadata including classes, framework, and version."""
        return {
            "model_id": self.model_id,
            "version": self.version,
            "framework": self.framework,
            "is_loaded": self.is_loaded,
            "metadata": self._metadata,
        }
