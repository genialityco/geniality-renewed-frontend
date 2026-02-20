import { ContentBlock } from "./types";
import NotionEditor from "./NotionEditor";

interface BlocksContainerProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

export default function BlocksContainer({
  blocks,
  onBlocksChange,
}: BlocksContainerProps) {
  return <NotionEditor blocks={blocks} onBlocksChange={onBlocksChange} />;
}
