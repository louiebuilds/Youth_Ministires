export type LoginActionState = {
  success: false;
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};
