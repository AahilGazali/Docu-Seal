import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SignatureOverlayProps {
  id: string;
  x: number;
  y: number;
  pageIndex: number;
  label?: string;
  disabled?: boolean;
}

export function SignatureOverlay({
  id,
  x,
  y,
  pageIndex,
  label = 'Signature',
  disabled = false,
}: SignatureOverlayProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sig-${id}`,
    data: { id, pageIndex, x, y },
    disabled,
  });

  // Base position from props
  const baseStyle = {
    left: `${x}%`,
    top: `${y}%`,
  };

  // Apply transform only during drag (relative offset)
  const dragStyle = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        ...baseStyle,
        ...dragStyle,
        zIndex: isDragging ? 50 : 10,
      }}
      className="flex cursor-grab items-center gap-1.5 rounded-lg border-2 border-dashed border-blue-500 bg-blue-100/95 px-3 py-2 text-sm font-semibold text-blue-900 shadow-md active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 shrink-0 text-primary-500" />
      <span>{label}</span>
    </div>
  );
}
