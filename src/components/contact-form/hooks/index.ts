import { useState } from "react";

function useContact() {
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [contactIsLoading, setContactIsLoading] = useState<boolean>(false);

  const handleUpdateFirstName = (updateFirstName: string) => {
    setFirstName(updateFirstName);
  };

  const handleUpdateLastName = (updateLastName: string) => {
    setLastName(updateLastName);
  };

  const handleUpdateSubject = (updateEmail: string) => {
    setSubject(updateEmail);
  };

  const handleUpdateMessage = (updateMessage: string) => {
    setMessage(updateMessage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactIsLoading(true);

    // Creates a function that will be called when the page visibility changes.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setContactIsLoading(false);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
    };

    // Add listener to monitor when the user returns to the page.
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const body = encodeURIComponent(
      `Olá, meu nome é: ${firstName} ${lastName}\n\n${message}`,
    );

    const mailtoLink = `mailto:intrajetto@gmail.com?subject=${subject}&body=${body}`;

    // Redirects to email client
    window.location.href = mailtoLink;
  };

  return {
    handleSubmit,
    firstName,
    lastName,
    subject,
    message,
    handleUpdateFirstName,
    handleUpdateLastName,
    handleUpdateSubject,
    handleUpdateMessage,
    contactIsLoading,
  };
}

export { useContact };
