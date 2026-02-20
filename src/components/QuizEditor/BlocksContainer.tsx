import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ContentBlock, TextBlock } from "./types";
import NotionEditor from "./NotionEditor";

interface BlocksContainerProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

export default function BlocksContainer({
  blocks,
  onBlocksChange,
}: BlocksContainerProps) {
  const [initializedBlocks, setInitializedBlocks] = useState<ContentBlock[]>(blocks);

  useEffect(() => {
    // Si no hay bloques, crear uno vacío para que se pueda editar
    if (!blocks || blocks.length === 0) {
      const defaultBlock: TextBlock = {
        type: "text",
        id: uuidv4(),
        content: "",
        format: "plain",
        listType: "none",
      };
      setInitializedBlocks([defaultBlock]);
      onBlocksChange([defaultBlock]);
    } else {
      setInitializedBlocks(blocks);
    }
  }, [blocks, onBlocksChange]);

  return <NotionEditor blocks={initializedBlocks} onBlocksChange={onBlocksChange} />;
}
