interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;

  /** A civil day (`YYYY-MM-DD`), not an instant — see ../helpers. */
  dateOnly?: boolean;

  /** The year dropdown reaches ahead too (see pickerYears). */
  allowFutureDates?: boolean;

  /**
   * A required field cannot be emptied by clicking its day again: the
   * calendar treats a click on the selected day as "unselect", and a
   * prefilled "today" vanished when someone clicked today to confirm it.
   */
  required?: boolean;
}

export type { DatePickerProps };
