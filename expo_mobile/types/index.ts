export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Tabs: undefined;
};

export type User = {
  username: string;
  password: string;
  embedding: number[];
  role?: string
};
