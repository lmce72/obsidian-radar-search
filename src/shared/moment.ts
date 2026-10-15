import { moment as obsidianMoment } from 'obsidian';
import type momentFactory from 'moment';

// Obsidian supplies the runtime; the callable signature comes from Moment's declarations.
export const moment=obsidianMoment as unknown as typeof momentFactory;
