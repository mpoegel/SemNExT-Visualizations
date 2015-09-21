declare module Twitter.Typeahead {
	interface Dataset {
		/**
         * For a given suggestion object, determines the string representation of it.
         * This will be used when setting the value of the input control after a suggestion is selected. Can be either a key string or a function that transforms a suggestion object into a string.
         * Defaults to value.
		 * Replaces displayKey.
          */
		display?: string;
	}
}

declare module Bloodhound {
	interface BloodhoundOptions<T> {
		/**
		 * Given a datum, this function is expected to return a unique id for it. Defaults to JSON.stringify. Note that it is highly recommended to override this option.
		 */
		identify: (T) => string;
	}
}