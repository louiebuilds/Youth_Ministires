export type ProfileActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message?: string;
      fieldErrors?: {
        displayName?: string[];
      };
    };
