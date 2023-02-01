function bootstrap() {
const input = document.getElementById("input");

const contra = document.getElementById("contra");
const cov = document.getElementById("cov");
const ein = document.getElementById("ein");

const tex = document.getElementById("tex");
const replaced_tex = document.getElementById("replaced_tex");

const errors = document.getElementById("errors");

const visitor = new IndexorInterpreter();
const replacer = new IndexorReplacer();

const outputElements = [contra, cov, ein, errors, tex, replaced_tex];

let parser_expression;

let indicesMap = {};

function show(e) {
    e.parentElement.className = "";
}

function hide(e) {
    e.parentElement.className = "hidden";
}

function replace() {
    let r = indicesMap;
    fields = document.getElementsByClassName("replace_value");
    for(i of fields) {
        if (i.name != i.value) {
            r[i.name] = i.value;
        }
    }

    if (Object.keys(r).length > 0) {
      indicesMap = r;
    }

    replacer.set_indicesMap(r);

    r = replacer.visit(parser_expression);

    let mj_options = MathJax.getMetricsFor(replaced_tex, true);
    const mj_tex = MathJax.tex2svg(r, mj_options);

    replaced_tex.replaceChildren();
    replaced_tex.appendChild(mj_tex);
    show(replaced_tex);
}

input.addEventListener("input", () => {
    if (input.value.length == 0) { return; }
    lexResult = IndexorLexer.tokenize(input.value);

    parser.input = lexResult.tokens
    parser_expression = parser.expression()

    outputElements.map((e) => {
        e.replaceChildren();
        hide(e);
    });

    if (parser.errors.length == 0) {
        r = visitor.visit(parser_expression);

        r.errors.forEach((e) => {
            const i = document.createElement("li");
            i.textContent = e;
            errors.appendChild(i);
        });

        if (r.errors.size > 0) {
            show(errors);
        }

        r.cov_list.forEach((i) => {
            const e = document.createElement("li");
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap["i"] || i;
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            cov.appendChild(e);
        });

        r.contra_list.forEach((i) => {
            const e = document.createElement("li");
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap["i"] || i;
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            contra.appendChild(e);
        });

        r.ein_list.forEach((i) => {
            const e = document.createElement("li");
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap["i"] || i;
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            ein.appendChild(e);
        });
        if (r.cov_list.length > 0) {
          show(cov);
        }
        if (r.contra_list.length > 0) {
          show(contra);
        }
        if (r.ein_list.length > 0) {
          show(ein);
        }

        let mj_options = MathJax.getMetricsFor(tex, true);
        const mj_tex = MathJax.tex2svg(input.value, mj_options);
        tex.appendChild(mj_tex);
        show(tex);
        replace();

    } else {
        parser.errors.forEach((e) => {
            const i = document.createElement("li");
            if (e.name == "NoViableAltException") {
                i.textContent = e.message;
            } else if (e.name == "MismatchedTokenException") {
                const pt = e.previousToken;
                i.textContent = "Error at position " + pt.startColumn + ", after '" + pt.image + "'";
            } else if (e.name = "NotAllInputParsedException") {
                i.textContent = e.message;
            }
            errors.appendChild(i);
        });
        if (parser.errors.length > 0) {
            show(errors);
        }
    }
});

input.dispatchEvent(new Event("input"));
}
