function bootstrap() {
const input = document.getElementById("input");

const contra = document.getElementById("contra");
const cov = document.getElementById("cov");
const ein = document.getElementById("ein");

const tex = document.getElementById("tex");
const replaced_tex = document.getElementById("replaced_tex");

const replace_btn = document.getElementById("replace");
replace_btn.textContent = "Replace";

const errors = document.getElementById("errors");

// const iparser = new IndexorPure([], { outputCst: true });
const visitor = new IndexorInterpreter();

const outputElements = [contra, cov, ein, errors, tex, replaced_tex];

function show(e) {
    e.parentElement.className = "";
}

function hide(e) {
    e.parentElement.className = "hidden";
}

function replace() {
    let r = {};
    fields = document.getElementsByClassName("replace_value");
    for(i of fields) {
        r[i.name] = i.value;
    }

    const replacer = new IndexorReplacer(r);

    lexResult = IndexorLexer.tokenize(input.value);

    parser.input = lexResult.tokens
    expr = parser.expression()

    r = replacer.visit(expr);

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
    expr = parser.expression()

    outputElements.map((e) => {
        e.replaceChildren();
        hide(e);
    });

    if (parser.errors.length == 0) {
        r = visitor.visit(expr);

        r.errors.forEach((e) => {
            const i = document.createElement("li");
            i.textContent = e;
            errors.appendChild(i);
        });

        if (r.errors.length > 0) {
            show(errors);
        } else {
            r.cov.forEach((i) => {
                const e = document.createElement("li");
                const text = document.createTextNode(i + " → ");
                const input = document.createElement("input");
                input.type = "text";
                input.name = i;
                input.value = i;
                input.size = 1;
                input.maxlength = 1;
                input.className = "replace_value";
                e.appendChild(text);
                e.appendChild(input);
                cov.appendChild(e);
            });

            r.contra.forEach((i) => {
                const e = document.createElement("li");
                const text = document.createTextNode(i + " → ");
                const input = document.createElement("input");
                input.type = "text";
                input.name = i;
                input.value = i;
                input.size = 1;
                input.maxlength = 1;
                input.className = "replace_value";
                e.appendChild(text);
                e.appendChild(input);
                contra.appendChild(e);
            });

            r.ein.forEach((i) => {
                const e = document.createElement("li");
                const text = document.createTextNode(i + " → ");
                const input = document.createElement("input");
                input.type = "text";
                input.name = i;
                input.value = i;
                input.size = 1;
                input.maxlength = 1;
                input.className = "replace_value";
                e.appendChild(text);
                e.appendChild(input);
                ein.appendChild(e);
            });
            // cov.textContent = r.cov_list.join(", ");
            // contra.textContent = r.contra_list.join(", ");
            // ein.textContent = r.ein_list.join(", ");
            show(cov);
            show(contra);
            show(ein);
            show(replace_btn);

            let mj_options = MathJax.getMetricsFor(tex, true);
            const mj_tex = MathJax.tex2svg(input.value, mj_options);
            //tex.innerHTML = mj_tex;
            tex.appendChild(mj_tex);
            show(tex);
        }

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

replace_btn.addEventListener("click", replace);

input.dispatchEvent(new Event("input"));
}
