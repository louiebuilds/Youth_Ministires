export type PasswordResetRequestState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        email?: string[];
      };
    };

export type UpdatePasswordState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        password?: string[];
        confirmPassword?: string[];
      };
    };
