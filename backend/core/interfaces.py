# backend/core/interfaces.py
from abc import ABC, abstractmethod
from typing import Any, List, Dict
import numpy as np

class IImageEncoder(ABC):
    """Abstract interface for image encoding strategies."""
    @abstractmethod
    def encode(self, data: np.ndarray) -> bytes:
        pass

class IImageRepository(ABC):
    """Abstract interface for image data persistence."""
    @abstractmethod
    def save(self, slot_id: int, image: Any) -> None:
        pass

    @abstractmethod
    def get(self, slot_id: int) -> Any:
        pass

    @abstractmethod
    def get_all(self) -> List[Any]:
        pass

class IMixerService(ABC):
    """Abstract interface for image mixing logic."""
    @abstractmethod
    def mix_images_per_type(self, images: List[Any], weights: List[Dict], **kwargs) -> np.ndarray:
        pass