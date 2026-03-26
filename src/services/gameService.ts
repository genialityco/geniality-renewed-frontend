import api from "./api";

export const generateDragDropContent = async (
  transcript: string
): Promise<string[]> => {
  const response = await api.post("/game-ai/generate-drag-drop", {
    transcript,
  });
  return response.data.dragDrop;
};
