import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      jobTitle?: string;
      avatarColor?: string;
      onboardedAt?: string | null;
      sessionVersion?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    jobTitle?: string;
    avatarColor?: string;
    onboardedAt?: Date | null;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    jobTitle?: string;
    avatarColor?: string;
    onboardedAt?: string | null;
    sessionVersion?: number;
  }
}
