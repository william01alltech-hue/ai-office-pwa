import { TableCell } from '@tiptap/extension-table-cell';

export const ReactiveTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      formula: {
        default: null,
        parseHTML: element => element.getAttribute('data-formula'),
        renderHTML: attributes => {
          if (!attributes.formula) {
            return {};
          }
          return {
            'data-formula': attributes.formula,
          };
        },
      },
    };
  },
});
