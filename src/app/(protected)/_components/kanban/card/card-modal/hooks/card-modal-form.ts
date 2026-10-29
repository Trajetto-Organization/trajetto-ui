import { useState, useEffect } from "react";
import type { UseCardModalFormProps, PriorityProps } from "../card-modal.types";

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

  // Store dueDate as ISO string to work with DatePickerField custom component
  const [dueDate, setDueDate] = useState<string>(card?.dueDate || "");

  const [assignedUserId, setAssignedUserId] = useState<string>(
    card?.assignedUserId || "none",
  );

  // Function to check if any field has been changed
  const checkIfDirty = (newValues: {
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    assignedUserId: string;
    completed: boolean;
  }) => {
    if (!isEditing || !card) {
      // Creation never waits for a change (decision 16.701): what is
      // missing is explained by the live validation on submit.
      setIsDirty(true);
      return;
    }

    // For editing, compare with original values
    const originalAssignedUserId = card.assignedUserId || "none";

    const hasChanges = [
      newValues.title !== card.title,
      newValues.description !== (card.description || ""),
      newValues.priority !== card.priority,
      newValues.dueDate !== (card.dueDate || ""),
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

  const handleDueDateChange = (value: string) => {
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
