const appendDataToForm = (formData: FormData, data: Record<string, string>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
};

export { appendDataToForm };
