"use server";

interface EmailVerificationProps {
  message: string;
}

const newVerification = async (token: string) => {
  const emailVerification = `${process.env.HTTP_REQUEST}/user/email-verification?token=${token}`;

  try {
    const response = await fetch(emailVerification, {
      credentials: "include",
      method: "POST",
    });

    const { message } = (await response.json()) as EmailVerificationProps;

    if (response.ok && message) {
      return { successMessage: message };
    }

    return {
      error: { errorMessage: message },
    };
  } catch (error) {
    return {
      error: {
        errorMessage:
          "Ocorreu um erro inesperado ao tentar verificar o e-mail.",
      },
    };
  }
};

export { newVerification };
