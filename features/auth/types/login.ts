export type LoginActionState =
  | { success: true }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        email?: string[];
        password?: string[];
      };
    };
