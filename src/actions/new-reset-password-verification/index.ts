"use server";

interface SubscriptionVerificationProps {
  message: string;
}

const newResetPasswordVerification = async (token: string) => {
  const subscriptionVerification = `${process.env.HTTP_REQUEST}/user/forgot-verification?token=${token}`;

  try {
    const response = await fetch(subscriptionVerification, {
      credentials: "include",
      method: "GET",
    });

    const { message } =
      (await response.json()) as SubscriptionVerificationProps;

    if (!response.ok && message) {
      return {
        error: { errorMessage: message },
      };
    }
  } catch (error) {
    return {
      error: {
        errorMessage:
          "Ocorreu um erro inesperado ao tentar verificar sua senha.",
      },
    };
  }
};

export { newResetPasswordVerification };
