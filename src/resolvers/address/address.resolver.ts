import { GraphQLError } from "graphql";
import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AddressMutationResponse,
  AddressesResponse,
  CreateAddressInput,
  UpdateAddressInput,
  UserAddress,
} from "./address.type";

function getUserId(ctx: Context): number {
  const userId = ctx.user?.dbUserId;
  if (!userId) {
    throw new GraphQLError("User ID not found in context");
  }
  return userId;
}

function validatePinCode(zip: string): boolean {
  // Indian PIN code format: 6 digits
  return /^\d{6}$/.test(zip);
}

function validateAddressInput(
  input: CreateAddressInput | UpdateAddressInput,
  isUpdate: boolean = false,
): string | null {
  if (!isUpdate) {
    const createInput = input as CreateAddressInput;
    if (!createInput.name?.trim()) {
      return "Name is required";
    }
    if (!createInput.address_line_1?.trim()) {
      return "Address line 1 is required";
    }
    if (!createInput.city?.trim()) {
      return "City is required";
    }
    if (!createInput.state?.trim()) {
      return "State is required";
    }
    if (!createInput.zip?.trim()) {
      return "ZIP code is required";
    }
    if (!validatePinCode(createInput.zip)) {
      return "Invalid PIN code format. Please enter a valid 6-digit PIN code.";
    }
  } else {
    const updateInput = input as UpdateAddressInput;
    if (updateInput.zip !== undefined && updateInput.zip !== null) {
      if (!validatePinCode(updateInput.zip)) {
        return "Invalid PIN code format. Please enter a valid 6-digit PIN code.";
      }
    }
  }

  return null;
}

@Resolver()
export class AddressResolver {
  @Query(() => AddressesResponse)
  @authRequired()
  async userAddresses(@Ctx() ctx: Context): Promise<AddressesResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const addresses = await prisma.userAddress.findMany({
        where: { user_id: userId },
        orderBy: { id: "desc" },
      });

      return {
        addresses,
        total: addresses.length,
      };
    });
  }

  @Query(() => UserAddress, { nullable: true })
  @authRequired()
  async addressById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<UserAddress | null> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const address = await prisma.userAddress.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      return address;
    });
  }

  @Mutation(() => AddressMutationResponse)
  @authRequired()
  async createAddress(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateAddressInput) input: CreateAddressInput,
  ): Promise<AddressMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const validationError = validateAddressInput(input);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      const address = await prisma.userAddress.create({
        data: {
          user_id: userId,
          name: input.name.trim(),
          address_line_1: input.address_line_1.trim(),
          address_line_2: input.address_line_2?.trim() ?? null,
          landmark: input.landmark?.trim() ?? null,
          city: input.city.trim(),
          state: input.state.trim(),
          zip: input.zip.trim(),
          contact_number: input.contact_number?.trim() ?? null,
        },
      });

      return {
        success: true,
        address,
      };
    });
  }

  @Mutation(() => AddressMutationResponse)
  @authRequired()
  async updateAddress(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UpdateAddressInput) input: UpdateAddressInput,
  ): Promise<AddressMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      // Check if address belongs to user
      const existingAddress = await prisma.userAddress.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!existingAddress) {
        return {
          success: false,
          error: "Address not found",
        };
      }

      const validationError = validateAddressInput(input, true);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // Build update data, only including non-null fields
      const updateData: {
        name?: string;
        address_line_1?: string;
        address_line_2?: string | null;
        landmark?: string | null;
        city?: string;
        state?: string;
        zip?: string;
        contact_number?: string | null;
      } = {};

      if (input.name !== undefined && input.name !== null) {
        updateData.name = input.name.trim();
      }
      if (input.address_line_1 !== undefined && input.address_line_1 !== null) {
        updateData.address_line_1 = input.address_line_1.trim();
      }
      if (input.address_line_2 !== undefined) {
        updateData.address_line_2 = input.address_line_2?.trim() ?? null;
      }
      if (input.landmark !== undefined) {
        updateData.landmark = input.landmark?.trim() ?? null;
      }
      if (input.city !== undefined && input.city !== null) {
        updateData.city = input.city.trim();
      }
      if (input.state !== undefined && input.state !== null) {
        updateData.state = input.state.trim();
      }
      if (input.zip !== undefined && input.zip !== null) {
        updateData.zip = input.zip.trim();
      }
      if (input.contact_number !== undefined) {
        updateData.contact_number = input.contact_number?.trim() ?? null;
      }

      const address = await prisma.userAddress.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        address,
      };
    });
  }

  @Mutation(() => AddressMutationResponse)
  @authRequired()
  async deleteAddress(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AddressMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      // Check if address belongs to user
      const existingAddress = await prisma.userAddress.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!existingAddress) {
        return {
          success: false,
          error: "Address not found",
        };
      }

      await prisma.userAddress.delete({
        where: { id },
      });

      return {
        success: true,
      };
    });
  }
}
