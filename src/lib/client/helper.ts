

export function modifyHtml(html: string) {

    let modifiedHtml;
    // Modify style tags to append scdesc id to all CSS selectors
    modifiedHtml = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
        const modifiedStyle = styleContent.replace(
            /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
            (selector: string) => {
                // Skip pseudo-elements and pseudo-classes
                if (/:/.test(selector)) return selector;
                
                // Append #scdesc to each selector, but not after curly braces
                return selector.replace(/([^\s,{]+)(?=([^{]*[{]))/g, '$1#scdesc');
            }
        );
        return `<style>${modifiedStyle}</style>`;
    });
    // Add scdesc id to all HTML elements
    // Add scdesc id to all HTML elements except style tags
    modifiedHtml = modifiedHtml.replace(
        /<([a-zA-Z][a-zA-Z0-9]*)(?![^>]*\bid=["'])[^>]*>/gi,
        (match, tag) => {
            if (tag.toLowerCase() !== 'style') {
                return match.replace('>', ' id="scdesc">');
            }
            return match;
        }
    );
    return modifiedHtml;
}