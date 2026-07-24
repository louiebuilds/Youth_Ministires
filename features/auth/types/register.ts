export type RegisterActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
    };
