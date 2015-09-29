/* extension of lib.d.ts
 *
 * This file contains extensions of the standard Typescript library
 * definitions that have not yet been accepted into standard Typescript
 * but nevertheless are still needed
 *
 * Definitions by Matt Poegel (https://github.com/mpoegel)
 */

interface HTMLAnchorElement {
	/*
	 * Is a DOMString indicating that the linked resource is intended to be
	 * downloaded rather than displayed in the browser. The value represent
	 * the proposed name of the file. If the name is not a valid filename of
	 * the underlying OS, browser will adapt it. The value is a URL with a
	 * scheme like http:, file:, data: or even blob:
	 * (created with URL.createObjectURL).
	 */
	download: string;
}

interface HTMLElement {
  /*
	 * An object of this type is returned by the files property of the HTML
	 * <input> element; this lets you access the list of files selected
	 * with the <input type="file"> element.
	 */
	files: FileList;
}
