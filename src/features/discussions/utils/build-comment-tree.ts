import type { DiscussionMessage } from "@/features/discussions/types";

export interface CommentNode {
  message: DiscussionMessage;
  children: CommentNode[];
}

export function buildCommentTree(messages: DiscussionMessage[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  messages.forEach((msg) => {
    nodeMap.set(msg.id, { message: msg, children: [] });
  });

  messages.forEach((msg) => {
    const node = nodeMap.get(msg.id)!;
    if (msg.parentMessageId && nodeMap.has(msg.parentMessageId)) {
      const parentNode = nodeMap.get(msg.parentMessageId)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
