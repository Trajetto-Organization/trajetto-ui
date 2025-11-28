import { useState, useEffect } from "react";
import { UseCardModalFormProps, PriorityProps } from "../dto";

// Function to convert date string (DD/MM/YYYY or ISO) to Date - same logic as Card
const parseCardDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  try {
    // If it is in DD/MM/YYYY format
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // If it is in ISO format or another valid format
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

function useCardModalForm({ card, isEditing, state }: UseCardModalFormProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState<string>(
    card?.description || "",
  );

  const [priority, setPriority] = useState<PriorityProps>(
    (card?.priority as PriorityProps) || "medium",
  );

  const [completed, setCompleted] = useState<boolean>(card?.completed || false);

  // Use the parseCardDate function to ensure the date is interpreted correctly
  const [dueDate, setDueDate] = useState<Date | undefined>(
    card?.dueDate ? parseCardDate(card.dueDate) || undefined : undefined,
  );

  const [assignedUserId, setAssignedUserId] = useState<string>(
    card?.assignedUserId || "none",
  );

  // Function to check if any field has been changed
  const checkIfDirty = (newValues: {
    title: string;
    description: string;
    priority: string;
    dueDate: Date | undefined;
    assignedUserId: string;
    completed: boolean;
  }) => {
    if (!isEditing || !card) {
      // For creation, check if you have the minimum necessary data
      setIsDirty(!!newValues.title.trim() && !!newValues.dueDate);
      return;
    }

    // For editing, compare with original values
    const originalDueDate = card.dueDate
      ? parseCardDate(card.dueDate)
      : undefined;
    const originalAssignedUserId = card.assignedUserId || "none";

    const hasChanges = [
      newValues.title !== card.title,
      newValues.description !== (card.description || ""),
      newValues.priority !== card.priority,
      newValues.dueDate?.toDateString() !== originalDueDate?.toDateString(),
      newValues.assignedUserId !== originalAssignedUserId,
      newValues.completed !== (card.completed || false),
    ].some(Boolean);

    setIsDirty(hasChanges);
  };

  // Handlers that update state and check isDirty
  const handleTitleChange = (value: string) => {
    setTitle(value);
    checkIfDirty({
      title: value,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    checkIfDirty({
      title,
      description: value,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handlePriorityChange = (value: PriorityProps) => {
    setPriority(value);
    checkIfDirty({
      title,
      description,
      priority: value,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handleDueDateChange = (value: Date | undefined) => {
    setDueDate(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate: value,
      assignedUserId,
      completed,
    });
  };

  const handleAssignedUserChange = (value: string) => {
    setAssignedUserId(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId: value,
      completed,
    });
  };

  // ✅ Handler para o checkbox completed
  const handleCompletedChange = (value: boolean) => {
    setCompleted(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed: value,
    });
  };

  // Check initial isDirty when modal opens
  useEffect(() => {
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  }, [isEditing, card]);

  const errorState = isEditing ? state.updateCardError : state.createCardError;

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    isDirty,
    handleTitleChange,
    handleDescriptionChange,
    handlePriorityChange,
    handleDueDateChange,
    handleAssignedUserChange,
    handleCompletedChange,
    errorState,
    description,
    completed,
    title,
    priority,
    dueDate,
    assignedUserId,
  };
}

export { useCardModalForm };
