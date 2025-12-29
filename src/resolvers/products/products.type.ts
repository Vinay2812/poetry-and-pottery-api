import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

enum ProductOrderBy {
  FEATURED = "featured",
  NEW = "new",
  PRICE_LOW_TO_HIGH = "price_low_to_high",
  PRICE_HIGH_TO_LOW = "price_high_to_low",
  RATING_HIGH_TO_LOW = "rating_high_to_low",
  RATING_LOW_TO_HIGH = "rating_low_to_high",
}

registerEnumType(ProductOrderBy, {
  name: "ProductOrderBy",
  description: "The order by which the products should be sorted",
});

@ObjectType()
export class ProductBase {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  image_urls!: string[];

  @Field(() => Int)
  price!: number;

  @Field(() => Int)
  reviews_count!: number;

  @Field(() => Int)
  avg_rating!: number;

  @Field(() => Int)
  material!: string;

  @Field(() => Int)
  total_quantity!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => String)
  color_code!: string;

  @Field(() => String)
  color_name!: string;

  @Field(() => Boolean)
  in_wishlist!: boolean;
}

@ObjectType()
export class ProductCategories {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  category!: string;
}

@InputType()
export class ProductsFilterInput {
  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [String], { nullable: true })
  categories?: string[];

  @Field(() => [String], { nullable: true })
  materials?: string[];

  @Field(() => Int, { nullable: true })
  min_price?: number;

  @Field(() => Int, { nullable: true })
  max_price?: number;

  @Field(() => ProductOrderBy, { nullable: true })
  order_by?: ProductOrderBy;
}

@ObjectType()
export class ProductsFilter {
  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [String], { nullable: true })
  categories?: string[];

  @Field(() => [String], { nullable: true })
  materials?: string[];

  @Field(() => Int, { nullable: true })
  min_price?: number;

  @Field(() => Int, { nullable: true })
  max_price?: number;

  @Field(() => ProductOrderBy, { nullable: true })
  order_by?: ProductOrderBy;
}

@ObjectType()
export class ProductsResponse {
  @Field(() => [ProductBase])
  products!: ProductBase[];

  @Field(() => ProductsFilter)
  filter!: ProductsFilter;

  @Field(() => Int)
  total_products!: number;

  @Field(() => Int)
  total_pages!: number;
}
