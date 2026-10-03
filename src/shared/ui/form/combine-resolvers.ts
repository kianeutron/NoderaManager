import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

/**
 * Runs several resolvers over the same values and merges what they find, so one form can be checked by more than one
 * command schema (a status change and the follow-up that goes with it). The first resolver's message wins for a field.
 */
export function combineResolvers<Values extends FieldValues>(...resolvers: readonly Resolver<Values>[]): Resolver<Values> {
  return async (values, context, options) => {
    const results = await Promise.all(resolvers.map((resolver) => resolver(values, context, options)));
    const errors = results.reduceRight<FieldErrors<Values>>((merged, result) => ({ ...merged, ...result.errors }), {});
    return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} };
  };
}
