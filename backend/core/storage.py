# backend/core/storage.py
from typing import List
from .interfaces import IImageRepository
from .image_processor import ImageModel

class InMemoryImageRepository(IImageRepository):
    """
    Concrete implementation of IImageRepository using in-memory dictionary.
    """
    def __init__(self, capacity: int = 4):
        self._storage = {}
        self._capacity = capacity

    def save(self, slot_id: int, image: ImageModel):
        if not (0 <= slot_id < self._capacity):
            raise ValueError(f"Slot ID must be 0-{self._capacity-1}")
        self._storage[slot_id] = image

    def get(self, slot_id: int) -> ImageModel:
        # Return stored image or an empty default
        return self._storage.get(slot_id, ImageModel())

    def get_all(self) -> List[ImageModel]:
        return [self.get(i) for i in range(self._capacity)]