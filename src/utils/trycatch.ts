import { GraphQLError } from "graphql";

export const tryCatchAsync = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(
      "Error in tryCatchAsync",
      fn.name,
      error instanceof Error ? error.message : "Internal server error",
    );
    throw new GraphQLError(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
};
