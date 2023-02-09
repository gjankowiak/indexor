function startindexor() {
const input = document.getElementById("input");

const contra = document.getElementById("contra");
const cov = document.getElementById("cov");
const ein = document.getElementById("ein");

const tex = document.getElementById("tex");
const replaced_tex = document.getElementById("replaced_tex");
const replaced_tex_plain = document.getElementById("replaced_tex_plain");
const spaces_cb = document.getElementById("spaces_checkbox");

const saved_expressions = document.getElementById("saved_expressions")

const errors = document.getElementById("errors");

const clear_btn = document.getElementById("clear_btn");

const visitor = new IndexorInterpreter();
const replacer = new IndexorReplacer();

const outputElements = [contra, cov, ein, errors, tex, replaced_tex];
const hideableOutputElements = [errors];

let current_replaced_tex = "";

let parser_expression;

let indicesMap = {};

let save_counter = 0;

let saved_expressions_list = [];

const regex = /(\\[a-zA-Z]+) ([a-zA-Z0-9])/gm;

function storageAvailable(type) {
    let storage;
    try {
        storage = window[type];
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

const has_localstorage = storageAvailable("localStorage")


function show(e) {
    e.parentElement.classList.remove("hidden");
}

function hide(e) {
    e.parentElement.classList.add("hidden");
}

function save() {
    const e = input.value;
    for (se of saved_expressions_list) {
      if (e === se.tex) {
        alert("This expression is aready saved!");
        return;
      }
    };
    new_expression = {
      id: save_counter++,
      svg: tex.childNodes[0].cloneNode(true),
      tex: e
    };

    insert_saved_expression(new_expression);

    saved_expressions_list.push(new_expression);
}

function restore_saved_expression(eid) {
  for (e of saved_expressions_list) {
      if (e.id == eid) {
        input.value = e.tex
        input.dispatchEvent(new Event("input"));
        return
      }
    }
}

function insert_saved_expression(e) {
  const d = document.createElement("li");
  d.className = "saved_expr list-group-item"
  d.setAttribute("eid", e.id);

  const restore_btn = document.createElement("button");
  restore_btn.textContent = "restore"
  restore_btn.className = "btn-outline-secondary btn btn-sm m-1";
  restore_btn.addEventListener("click", () => restore_saved_expression(e.id))

  const delete_btn = document.createElement("button");
  delete_btn.textContent = "delete"
  delete_btn.className = "btn-outline-danger btn btn-sm m-1";
  delete_btn.addEventListener("click", () => delete_saved_expression(e.id))
  
  const mj_output = document.createElement("div")
  mj_output.className = "tex"
  mj_output.appendChild(e.svg);
  
  const tex_expr = document.createElement("code")
  tex_expr.className = "m-1 d-block";
  tex_expr.textContent = e.tex;

  d.appendChild(mj_output);
  d.appendChild(tex_expr);
  d.appendChild(restore_btn);
  d.appendChild(delete_btn);

  saved_expressions.appendChild(d);

  show(saved_expressions);
}

function delete_saved_expression(eid) {
  saved_expressions.childNodes.forEach((e) => {
    if (e.attributes.eid.value == eid) {
      e.remove()
    }
  })  

  saved_expressions_list = saved_expressions_list.filter((e) => {
      return e.id != eid;
  })

  if (saved_expressions_list.length == 0) {
      hide(saved_expressions);
  }
}
 
function replace() {
    let r = {};
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

    current_replaced_tex = replacer.visit(parser_expression);

    let mj_options = MathJax.getMetricsFor(replaced_tex, true);
    const mj_tex = MathJax.tex2svg(current_replaced_tex, mj_options);

    replaced_tex_plain.textContent = spaces_cb.checked ? remove_tex_spaces(current_replaced_tex) : current_replaced_tex;

    replaced_tex.replaceChildren();
    replaced_tex.appendChild(mj_tex);
}

function remove_tex_spaces(tex) {
  let res = tex.replaceAll(regex, "$1¶ $2").replaceAll(" ", "").replaceAll("¶", " ");
  return res;
}

function toggleSpaces() {
    replaced_tex_plain.textContent = spaces_cb.checked ? remove_tex_spaces(current_replaced_tex) : current_replaced_tex;
}

function clearMap() {
    indicesMap = {};
    fields = document.getElementsByClassName("replace_value");
    for(i of fields) {
        i.value = ""
    }
    replace()
}

input.addEventListener("input", () => {
    if (input.value.length == 0) {
      return;
    }
    lexResult = IndexorLexer.tokenize(input.value);

    parser.input = lexResult.tokens
    parser_expression = parser.expression()

    outputElements.map((e) => {
        e.replaceChildren();
    });

    hideableOutputElements.map((e) => hide(e));

    hide(clear_btn);

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
            e.className = "list-group-item";
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap[i] || "";
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            cov.appendChild(e);
        });

        r.contra_list.forEach((i) => {
            const e = document.createElement("li");
            e.className = "list-group-item";
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap[i] || "";
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            contra.appendChild(e);
        });

        r.ein_list.forEach((i) => {
            const e = document.createElement("li");
            e.className = "list-group-item";
            const text = document.createElement("span");
            text.textContent = i + " → ";
            text.className = "replace_target";
            const input = document.createElement("input");
            input.type = "text";
            input.name = i;
            input.value = indicesMap[i] || "";
            input.size = 10;
            input.className = "replace_value";
            input.addEventListener("input", replace);
            e.appendChild(text);
            e.appendChild(input);
            ein.appendChild(e);
        });
        if (r.cov_list.length > 0) {
          show(clear_btn)
        }
        if (r.contra_list.length > 0) {
          show(clear_btn)
        }
        if (r.ein_list.length > 0) {
          show(clear_btn)
        }

        let mj_options = MathJax.getMetricsFor(tex, true);
        const mj_tex = MathJax.tex2svg(input.value, mj_options);
        tex.appendChild(mj_tex);
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

spaces_cb.addEventListener("click", toggleSpaces)

clear_btn.addEventListener("click", clearMap)

save_btn.addEventListener("click", save)

input.dispatchEvent(new Event("input"));
}
