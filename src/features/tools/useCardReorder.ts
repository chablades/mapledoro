"use client";

import { useState } from "react";

export interface CardDragProps {
  draggable: true;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

/**
 * HTML5 drag-to-reorder for a grid/list of cards. Shared by the Boss Crystal
 * and Daily trackers, which both hold an ordered, manually-added character list.
 * `dragProps(index)` spreads onto each card; `isDragging`/`isDropTarget` drive
 * the dimmed / accent-border states.
 */
export function useCardReorder(reorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const dragProps = (index: number): CardDragProps => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      // Defer so the browser snapshots the card before it dims.
      setTimeout(() => setDragIndex(index), 0);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index);
      setDragIndex(null);
      setOverIndex(null);
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  const isDragging = (index: number) => dragIndex === index;
  const isDropTarget = (index: number) =>
    overIndex === index && dragIndex !== null && dragIndex !== index;

  return { dragProps, isDragging, isDropTarget };
}
