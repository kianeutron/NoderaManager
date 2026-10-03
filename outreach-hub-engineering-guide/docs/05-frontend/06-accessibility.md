    # Accessibility Standards

    Meet WCAG 2.2 AA as the practical target.

- keyboard access for all actions;
- visible focus indicators;
- semantic headings/landmarks;
- labels for inputs/icons;
- color never the only status signal;
- sufficient contrast despite glass/dark theme;
- dialogs trap/restore focus correctly;
- charts have textual summaries/tooltips and accessible labels;
- tables use proper headers;
- reduced-motion preference respected;
- errors announced appropriately;
- touch targets remain usable.

MUI defaults help, but custom styling can break accessibility. Test keyboard flows and run automated accessibility checks in Playwright for critical pages.

