/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from '../../configuration/common/configuration.js';

/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link CONFIG_KEY}.
 *
 * ### Functions
 *
 * - {@link getValue} allows to current read configuration value
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### Configuration Examples
 *
 * Enable the feature using the default `'.github/prompts'` folder as a source of prompt files:
 * ```json
 * {
 *   "chat.promptFiles": {},
 * }
 * ```
 *
 * Enable the feature, providing multiple source folder paths for prompt files,
 * in addition to the default `'.github/prompts'` one:
 * ```json
 * {
 *   "chat.promptFiles": {
 *     ".copilot/prompts" : false,
 *     "/Users/legomushroom/repos/prompts" : true,
 *   },
 * }
 * ```
 *
 * See the next section for details on how we treat the config value.
 *
 * ### Possible Values
 *
 * - `undefined`/`null`: feature is disabledx
 * - `object`:
 *   - expects the { "string": `boolean` } pairs, where the `string` is a path and the `boolean`
 *     is a flag that defines if this additional source folder is enabled or disabled;
 *     enabled source folders are used in addition to the default {@link DEFAULT_SOURCE_FOLDER} path;
 *     you can explicitly disable the default source folder by setting it to `false` in the object
 *   - value of a record in the object can also be a `string`:
 *     - if the string can be clearly mapped to a `boolean` (e.g., `"true"`, `"FALSE", "TrUe"`, etc.),
 *       it is treated as `boolean` value
 *     - any other string value is treated as `false` and is effectively ignored
 *   - if the record `key` is an `empty` string, it is ignored
 *   - if the resulting object is empty, the feature is considered `enabled`, prompt files source
 *     folders fallback to the default {@link DEFAULT_SOURCE_FOLDER} path
 *   - if the resulting object is not empty, and the default {@link DEFAULT_SOURCE_FOLDER} path
 *     is not explicitly disabled, it is added to the list of prompt files source folders
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export namespace PromptsConfig {
	/**
	 * Configuration key for the `prompt files` feature (also
	 * known as `prompt files`, `prompt instructions`, etc.).
	 */
	export const CONFIG_KEY: string = 'chat.promptFiles';

	/**
	 * Default reusable prompt files source folder.
	 */
	export const DEFAULT_SOURCE_FOLDER = '.github/prompts';

	/**
	 * Get value of the `prompt files` configuration setting.
	 */
	export const getValue = (
		configService: IConfigurationService,
	): Record<string, boolean> | undefined => {
		const configValue = configService.getValue(CONFIG_KEY);

		if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
			return undefined;
		}

		// note! this would be also true for `null` and `array`,
		// 		 but those cases are already handled above
		if (typeof configValue === 'object') {
			const paths: Record<string, boolean> = {};

			for (const [path, value] of Object.entries(configValue)) {
				const cleanPath = path.trim();
				const booleanValue = asBoolean(value);

				// if value can be mapped to a boolean, and the clean
				// path is not empty, add it to the map
				if ((booleanValue !== undefined) && cleanPath) {
					paths[cleanPath] = booleanValue;
				}
			}

			return paths;
		}

		return undefined;
	};

	/**
	 * Checks if the feature is enabled.
	 */
	export const enabled = (
		configService: IConfigurationService,
	): boolean => {
		const value = getValue(configService);

		return value !== undefined;
	};

	/**
	 * Gets list of source folders for prompt files.
	 * Defaults to {@link DEFAULT_SOURCE_FOLDER}.
	 */
	export const promptSourceFolders = (
		configService: IConfigurationService,
	): string[] => {
		const value = getValue(configService);

		// note! the `value &&` part handles the `undefined`, `null`, and `false` cases
		if (value && (typeof value === 'object')) {
			const paths: string[] = [];

			// if the default source folder is not explicitly disabled, add it
			if (value[DEFAULT_SOURCE_FOLDER] !== false) {
				paths.push(DEFAULT_SOURCE_FOLDER);
			}

			// copy all the enabled paths to the result list
			for (const [path, enabled] of Object.entries(value)) {
				if (enabled && path !== DEFAULT_SOURCE_FOLDER) {
					paths.push(path);
				}
			}

			return paths;
		}

		// `undefined`, `null`, and `false` cases
		return [];
	};
}

/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
function asBoolean(value: any): boolean | undefined {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		const cleanValue = value.trim().toLowerCase();
		if (cleanValue === 'true') {
			return true;
		}

		if (cleanValue === 'false') {
			return false;
		}

		return undefined;
	}

	return undefined;
}
