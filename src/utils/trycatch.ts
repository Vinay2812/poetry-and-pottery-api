import { GraphQLError } from "graphql";

export const tryCatch = <T>(fn: () => T): T | Error => {
  try {
    return fn();
  } catch (error) {
    return error as Error;
  }
};

export const tryCatchAsync = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(error);
    throw new GraphQLError(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
};
