//(function latexExampleCst() {
import chevrotain from 'https://cdn.jsdelivr.net/npm/chevrotain@11.0.3/+esm';
"use strict";
/**
* An Example of implementing a Indexor with separated grammar and semantics (actions).
* This separation makes it easier to maintain the grammar and reuse it in different use cases.
*
* This is accomplished by using the automatic CST (Concrete Syntax Tree) output capabilities
* of chevrotain.
*
* See farther details here:
* https://chevrotain.io/docs/guide/concrete_syntax_tree.html
*/

function union(setA, setB) {
  const _union = new Set(setA);
  for (const elem of setB) {
    _union.add(elem);
  }
  return _union;
}

function intersection(setA, setB) {
  const _intersection = new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

function symmetricDifference(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) {
    if (_difference.has(elem)) {
      _difference.delete(elem);
    } else {
      _difference.add(elem);
    }
  }
  return _difference;
}

function difference(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

const createToken = chevrotain.createToken;
const tokenMatcher = chevrotain.tokenMatcher;
const Lexer = chevrotain.Lexer;
const CstParser = chevrotain.CstParser;

// using the NA pattern marks this Token class as 'irrelevant' for the Lexer.
// AdditionOperator defines a Tokens hierarchy but only the leafs in this hierarchy define
// actual Tokens that can appear in the text
const AdditionOperator = createToken({name: "AdditionOperator", pattern: Lexer.NA});
const Plus = createToken({name: "Plus", pattern: /\+/, categories: AdditionOperator});
const Minus = createToken({name: "Minus", pattern: /-/, categories: AdditionOperator});
const Equal = createToken({name: "Equal", pattern: /=/, categories: AdditionOperator});

const MultiplicationOperator = createToken({name: "MultiplicationOperator", pattern: Lexer.NA});
const Multi = createToken({name: "Multi", pattern: /\*/, categories: MultiplicationOperator});

const LParen = createToken({name: "LParen", pattern: /\(/});
const RParen = createToken({name: "RParen", pattern: /\)/});

const ScriptOperator = createToken({name: "ScriptOperator", pattern: Lexer.NA});
const SupScript = createToken({name: "SupScript", pattern: /\^/, categories: ScriptOperator});
const SubScript = createToken({name: "SubScript", pattern: /_/, categories: ScriptOperator});

const LBracket = createToken({name: "LBracket", pattern: /{/});
const RBracket = createToken({name: "RBracket", pattern: /}/});

const Literal = createToken({name: "Literal", pattern: Lexer.NA});
const NumberLiteral = createToken({name: "NumberLiteral", pattern: /[1-9]\d*/, categories: Literal});
const AlphaLiteral = createToken({name: "AlphaLiteral", pattern: /\\?[a-zA-ZαβΓγΔδεζηΘθικΛλμνΞξΠπρΣσςτυΦφχΨψΩω]+/, categories: Literal});

const Fraction = createToken({name: "Fraction", pattern: /\\frac/, longer_alt: AlphaLiteral});

const DiffOperator = createToken({name: "DiffOperator", pattern: Lexer.NA});
const Comma = createToken({name: "Comma", pattern: /,/, categories: DiffOperator});
const Colon = createToken({name: "Colon", pattern: /;/, categories: DiffOperator});

// marking WhiteSpace as 'SKIPPED' makes the lexer skip it.
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED
});

const allTokens = [WhiteSpace, // whitespace is normally very common so it should be placed first to speed up the lexer's performance
  Plus, Minus, Multi, Equal, LParen, RParen, SubScript, SupScript, LBracket, RBracket,
  Fraction, Literal,
  AlphaLiteral, NumberLiteral, AdditionOperator, MultiplicationOperator, ScriptOperator, DiffOperator, Comma, Colon];
const IndexorLexer = new Lexer(allTokens);

// ----------------- parser -----------------
// Note that this is a Pure grammar, it only describes the grammar
// Not any actions (semantics) to perform during parsing.
class IndexorPure extends CstParser {
  constructor() {
    super(allTokens);

    const $ = this;

    $.RULE("expression", () => {
      $.OPTION(() => {
        $.CONSUME(Minus);
      });
      $.SUBRULE($.additionExpression)
    });

    //  lowest precedence thus it is first in the rule chain
    // The precedence of binary expressions is determined by how far down the Parse Tree
    // The binary expression appears.
    $.RULE("additionExpression", () => {
      $.SUBRULE($.multiplicationExpression, {LABEL: "lhs"});
      $.MANY(() => {
        // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
        $.CONSUME(AdditionOperator);
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        $.SUBRULE2($.multiplicationExpression, {LABEL: "rhs"});
      });
    });

    $.RULE("multiplicationExpression", () => {
      $.SUBRULE($.atomicExpression, {LABEL: "lhs"});
      $.MANY(() => {
        // $.CONSUME(MultiplicationOperator);
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        $.SUBRULE2($.atomicExpression, {LABEL: "rhs"});
      });
    });

    $.RULE("atomicExpression", () => $.OR([
      // parenthesisExpression has the highest precedence and thus it appears
      // in the "lowest" leaf in the expression ParseTree.
      {ALT: () => $.SUBRULE($.parenthesisExpression)},
      //{ALT: () => $.CONSUME(NumberLiteral)},
      {ALT: () => $.SUBRULE($.fraction)},
      //{ALT: () => $.CONSUME(AlphaLiteral)},
      {ALT: () => $.SUBRULE($.subExpr)}
      //{ALT: () => $.SUBRULE($.supScriptedExpression)}
    ]));

    $.RULE("fraction", () => {
      $.CONSUME(Fraction);
      $.CONSUME(LBracket);
      $.SUBRULE($.expression, {LABEL: "num"});
      $.CONSUME(RBracket);
      $.CONSUME2(LBracket);
      $.SUBRULE2($.expression, {LABEL: "denom"});
      $.CONSUME2(RBracket);
    })

    $.RULE("parenthesisExpression", () => {
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
      $.OPTION(() => {
        $.SUBRULE($.scripts, {LABEL: "scripts"});
      });
    });
    
    $.RULE("subExpr", () => {
      $.CONSUME(Literal, {LABEL: "literal"});
      $.OPTION(() => {
        $.SUBRULE($.scripts, {LABEL: "scripts"});
      });
    });

    $.RULE("scripts", () => $.OR([
      {ALT: () => $.SUBRULE($.subSupScript, {LABEL:"subSup"})},
      {ALT: () => $.SUBRULE($.supSubScript, {LABEL:"supSub"})}
    ]));

    $.RULE("subSupScript", () => {
      $.CONSUME(SubScript);
      $.CONSUME(LBracket);
      $.SUBRULE2($.commaScriptExpression, {LABEL: "cov"});
      $.CONSUME(RBracket);
      $.OPTION(() => {
        $.CONSUME2(SupScript);
        $.CONSUME2(LBracket);
        $.SUBRULE2($.indicesExpression, {LABEL: "contra"});
        $.CONSUME2(RBracket);
      });
    });

    $.RULE("supSubScript", () => {
      $.CONSUME(SupScript);
      $.CONSUME(LBracket);
      $.SUBRULE2($.indicesExpression, {LABEL: "contra"});
      $.CONSUME(RBracket);
      $.OPTION(() => {
        $.CONSUME2(SubScript);
        $.CONSUME2(LBracket);
        $.SUBRULE2($.commaScriptExpression, {LABEL: "cov"});
        $.CONSUME2(RBracket);
      });
    });

    $.RULE("commaScriptExpression", () => $.OR([
      {ALT: () => $.SUBRULE($.commaInfixedExpression, {LABEL: "cov"})},
      {ALT: () => $.SUBRULE($.commaPrefixedExpression, {LABEL: "comma"})},
    ]));

    $.RULE("commaInfixedExpression", () => {
      $.SUBRULE($.indicesExpression, {LABEL: "lhs"});
      $.OPTION(() => {
        $.CONSUME(DiffOperator, {LABEL:"diffop"});
        $.SUBRULE2($.indicesExpression, {LABEL: "rhs"});
      });
    });

    $.RULE("commaPrefixedExpression", () => {
      $.CONSUME(DiffOperator, {LABEL:"diffop"});
      $.SUBRULE($.indicesExpression, {LABEL: "rhs"});
    });

    $.RULE("indicesExpression", () => {
      $.CONSUME(Literal, {LABEL:"head"});
      $.MANY(() => {
        $.SUBRULE2($.indicesExpression, {LABEL: "tail"});
      });
    });

    // very important to call this after all the rules have been defined.
    // otherwise the parser may not work correctly as it will lack information
    // derived during the self analysis phase.
    this.performSelfAnalysis();
  }
}

// wrapping it all together
// reuse the same parser instance.
const parser = new IndexorPure([]);

// ----------------- Interpreter -----------------
const BaseCstVisitor = parser.getBaseCstVisitorConstructor()

class IndexorInterpreter extends BaseCstVisitor {

  constructor() {
    super()
    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor()
  }

  // Rules for indices
//
  // one index cannot appear more than once at a given level
  // in a single multiplicative expression, an index may appear once
  // "upstairs" and once "downstairs". If both, it corresponds to a contraction
  // Two terms (in an additive expression) must have the same set of indices,
  // both upstairs and downstairs, excluding those corresponding to contractions.

  expression(ctx) {
    const result = this.visit(ctx.additionExpression);
    result.cov_list = [];
    result.contra_list = [];
    result.ein_list = [];

    result.cov.forEach((v) => result.cov_list.push(v));
    result.contra.forEach((v) => result.contra_list.push(v));
    result.ein.forEach((v) => result.ein_list.push(v));

    result.cov_list.sort();
    result.contra_list.sort();
    result.ein_list.sort();

    return result;
  }

  additionExpression(ctx) {
    let result_lhs = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        let result_rhs = this.visit(rhsOperand)

        // operator might be = + or -
        let operator = ctx.AdditionOperator[idx]

        // get the operator offset to make error reporting more helpful
        let pos = operator.startOffset;

        // propagate errors from the rhs
        result_lhs.errors = union(result_lhs.errors, result_rhs.errors);

        // check that all indices appear on each side at the same level
        const symdiff_cov = symmetricDifference(result_lhs.cov, result_rhs.cov);
        const symdiff_contra = symmetricDifference(result_lhs.contra, result_rhs.contra);

        symdiff_cov.forEach((idc) => {
          let side = "left";
          if (result_rhs.cov.has(idc)) { side = "right" }
          result_lhs.errors.add("Covariant index '" + idc + "' appears only on the " + side + " of " + operator.image + " (char. " + pos + ")");
        });

        symdiff_contra.forEach((idc) => {
          let side = "left";
          if (result_rhs.contra.has(idc)) { side = "right" }
          result_lhs.errors.add("Contravariant index '" + idc + "' appears only on the " + side + " of " + operator.image + " (char. " + pos + ")");
        });

        // add indices from the rhs to the lhs
        // this is not needed for a correct expression
        // but avoids resetting the replacement rule if an
        // index is delete from the lhs and added again
        result_rhs.cov.forEach((idc) => {
          result_lhs.cov.add(idc);
        });

        result_rhs.contra.forEach((idc) => {
          result_lhs.contra.add(idc);
        });

        // Einstein sum indices are simply carried over to the lhs
        result_rhs.ein.forEach((idc) => {
          result_lhs.ein.add(idc);
        });
      })
    }

    return result_lhs
  }

  multiplicationExpression(ctx) {
    let result_lhs = this.visit(ctx.lhs)

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        let result_rhs = this.visit(rhsOperand);

        // propagate errors from the rhs
        result_lhs.errors = union(result_lhs.errors, result_rhs.errors);

        // check that an index does not appear twice as covariant or contravariant
        const inter_cov = intersection(result_lhs.cov, result_rhs.cov);
        const inter_contra = intersection(result_lhs.contra, result_rhs.contra);

        [inter_cov, inter_contra].forEach((inter) => {
          inter.forEach((idc) => {
            result_lhs.errors.add("index '" + idc + "' appears twice at the same level on either sides of a multiplication");
          });
        });

        // convert indices that appear both upstairs and downstairs to Einstein sum indices
        const inter_cov_contra = intersection(result_lhs.cov, result_rhs.contra);
        const inter_contra_cov = intersection(result_lhs.contra, result_rhs.cov);

        inter_cov_contra.forEach((idc) => {
          result_lhs.cov.delete(idc);
          result_rhs.contra.delete(idc);
          result_lhs.ein.add(idc);
        });

        inter_contra_cov.forEach((idc) => {
          result_lhs.contra.delete(idc);
          result_rhs.cov.delete(idc);
          result_lhs.ein.add(idc);
        });

        // carry all indices over to the lhs
        result_rhs.cov.forEach((idc) => {
          result_lhs.cov.add(idc);
        });

        result_rhs.contra.forEach((idc) => {
          result_lhs.contra.add(idc);
        });

        result_rhs.ein.forEach((idc) => {
          result_lhs.ein.add(idc);
        });
      });
    }

  return result_lhs;
  }

  atomicExpression(ctx) {
  if (ctx.parenthesisExpression) {
      // passing an array to "this.visit" is equivalent
      // to passing the array's first element
      return this.visit(ctx.parenthesisExpression)
    }
    else if (ctx.fraction) {
      return this.visit(ctx.fraction)
    }
    else if (ctx.subExpr) {
      return this.visit(ctx.subExpr)
    }
  }

  fraction(ctx) {
    const result_num = this.visit(ctx.num);
    const result_denom = this.visit(ctx.denom);

    result_denom.errors.forEach((e) => result_num.errors.add(e));

    // find Einstein sum indices
  
    const inter_cov_cov = intersection(result_num.cov, result_denom.cov);
    const inter_contra_contra = intersection(result_num.contra, result_denom.contra);

    inter_cov_cov.forEach((idc) => {
      result_num.cov.delete(idc);
      result_denom.cov.delete(idc);
      result_num.ein.add(idc);
    });

    inter_contra_contra.forEach((idc) => {
      result_num.contra.delete(idc);
      result_denom.contra.delete(idc);
      result_num.ein.add(idc);
    });

    // carry all indices over to the lhs
    result_denom.cov.forEach((idc) => {
      result_num.contra.add(idc);
    });

    result_denom.contra.forEach((idc) => {
      result_num.cov.add(idc);
    });

    result_denom.ein.forEach((idc) => {
      result_num.ein.add(idc);
    });

    return result_num;
  }

  parenthesisExpression(ctx) {
    // The ctx will also contain the parenthesis tokens, but we don't care about those
    // in the context of calculating the result.
    const result_par = this.visit(ctx.expression);
    if (ctx.scripts) {
      const result_scripts = this.visit(ctx.scripts);

      // check that an index does not appear twice as covariant or contravariant
      const inter_cov = intersection(result_par.cov, result_scripts.cov);
      const inter_contra = intersection(result_par.contra, result_scripts.contra);
      const ein_par = intersection(result_par.ein, union(result_scripts.cov, result_scripts.contra));
      const ein_scripts = intersection(result_scripts.ein, union(result_par.cov, result_par.contra));

      [inter_cov, inter_contra, ein_par, ein_scripts].forEach((inter) => {
        inter.forEach((idc) => {
          result_par.errors.add("index '" + idc + "' appears twice at the same level in and outside of parenthenses");
        });
      });

      // convert indices that appear both upstairs and downstairs to Einstein sum indices
      let inter_cov_contra = intersection(result_par.cov, result_scripts.contra);
      const inter_contra_cov = intersection(result_par.contra, result_scripts.cov);

      inter_cov_contra.forEach((idc) => {
        result_par.cov.delete(idc);
        result_scripts.contra.delete(idc);
        result_par.ein.add(idc);
      });

      inter_contra_cov.forEach((idc) => {
        result_par.contra.delete(idc);
        result_scripts.cov.delete(idc);
        result_par.ein.add(idc);
      });

      // carry all indices over to the lhs
      result_scripts.cov.forEach((idc) => {
        result_par.cov.add(idc);
      });

      result_scripts.contra.forEach((idc) => {
        result_par.contra.add(idc);
      });

      result_scripts.ein.forEach((idc) => {
        result_par.ein.add(idc);
      });
    }
    return result_par;
  }

  subExpr(ctx) {
    let image = ctx.literal[0].image;
    let result;
    if (ctx.scripts) {
      result = this.visit(ctx.scripts, image);
    } else {
      result = {cov: new Set([]), contra: new Set([]), ein: new Set([]), errors: new Set([]), image:image};
    }
    return result;
  }
  
  scripts(ctx, image) {
    let result;
    if (ctx.subSup) {
      result = this.visit(ctx.subSup, image);
    } else {
      result = this.visit(ctx.supSub, image);
    }
    return result;
  }
  
  subSupScript(ctx, image) {
    let result_sub = this.visit(ctx.cov, image);
    let result_sup = {idx: new Set([]), errors: new Set([])};
    if (ctx.contra) {
      result_sup = this.visit(ctx.contra, image);
    }
    
    // check for repeated indices
    let ein = intersection(result_sub.idx, result_sup.idx);
    ein.forEach((idc) => {
      result_sub.idx.delete(idc);
      result_sup.idx.delete(idc);
    });

    const result = {
      cov: result_sub.idx,
      contra: result_sup.idx,
      ein: ein,
      errors: union(result_sub.errors, result_sub.errors)
    };

    return result
  }
  
  supSubScript(ctx, image) {
    let result_sup = this.visit(ctx.contra, image);
    let result_sub = {idx: new Set([]), errors: new Set([])};
    if (ctx.cov) {
      result_sub = this.visit(ctx.cov, image);
    }
    
    // check for repeated indices
    let ein = intersection(result_sub.idx, result_sup.idx);
    ein.forEach((idc) => {
      result_sub.idx.delete(idc);
      result_sup.idx.delete(idc);
    });

    const result = {
      cov: result_sub.idx,
      contra: result_sup.idx,
      ein: ein,
      errors: union(result_sub.errors, result_sub.errors)
    };

    return result
  }

  commaScriptExpression(ctx, image) {
    if (ctx.cov) {
      return this.visit(ctx.cov, image);
    } else {
      return this.visit(ctx.comma, image);
    }
  }

  commaPrefixedExpression(ctx, image) {
    return this.visit(ctx.rhs, image);
  }

  commaInfixedExpression(ctx, image) {
    let result_lhs = this.visit(ctx.lhs, image);
    if (ctx.rhs) {
      const result_rhs = this.visit(ctx.rhs, image);
      result_lhs.errors = union(result_lhs.errors, result_rhs.errors);
      const intersec = intersection(result_rhs.idx, result_lhs.idx).size;
      if (intersec.size > 0) {
        intersec.forEach((idc) => {
          result_lhs.errors.add("index '" + idc + "' appears twice at the same level of " + image);
        });
      }
      result_rhs.idx.forEach((idc) => {
        result_lhs.idx.add(idc);
      });
    }
    return result_lhs;
  }

  indicesExpression(ctx, image) {
    const current_idx = ctx.head[0];
    if (ctx.tail) {
      const tailResult = this.visit(ctx.tail, image);
      if (current_idx.tokenType.name == "AlphaLiteral") {
        if (!tailResult.idx.has(current_idx.image)) {
          tailResult.idx.add(current_idx.image);
        } else {
          tailResult.errors.add("index '" + current_idx + "' appears twice at the same level of " + image);
         }
      }
      return tailResult;
    } else {
        let idx_set = new Set([]);
        if (current_idx.tokenType.name == "AlphaLiteral") {
            idx_set.add(current_idx.image);
        }
        return {idx: idx_set, errors: new Set([])};
    }
  }
}

class IndexorReplacer extends BaseCstVisitor {
  constructor() {
    super()
    // This helper will detect any missing or redundant methods on this visitor
    this.indicesMap = {};
    this.indices = new Set([]);
    this.validateVisitor()
  }

  set_indicesMap(indicesMap) {
    this.indicesMap = indicesMap
    this.indices.clear()
    Object.keys(this.indicesMap).forEach((idc) => {
      if (this.indicesMap[idc]) {
        this.indices.add(idc)
      }
    });
  }

  expression(ctx) {
    let r = "";
    if (ctx.Minus) {
      r = "-";
    }
    r += this.visit(ctx.additionExpression);
    return r;
  }

  additionExpression(ctx) {
    let result = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        let rhsValue = this.visit(rhsOperand)
        let operator = ctx.AdditionOperator[idx]
        result += " " + operator.image + " " + rhsValue;
      })
    }
    return result;
  }

  multiplicationExpression(ctx) {
    let result_lhs = this.visit(ctx.lhs)

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        let result_rhs = this.visit(rhsOperand);
        result_lhs += " " + result_rhs;
      });
    }

    return result_lhs;
  }

  atomicExpression(ctx) {
    if (ctx.parenthesisExpression) {
      // passing an array to "this.visit" is equivalent
      // to passing the array's first element
      return this.visit(ctx.parenthesisExpression)
    } else if (ctx.fraction) {
      return this.visit(ctx.fraction);
    } else if (ctx.subExpr) {
      return this.visit(ctx.subExpr);
    }
  }

  fraction(ctx) {
    return "\\frac{" + this.visit(ctx.num) + "}{" + this.visit(ctx.denom) + "}";
  }

  parenthesisExpression(ctx) {
    // The ctx will also contain the parenthesis tokens, but we don't care about those
    // in the context of calculating the result.
    let par = "(" + this.visit(ctx.expression) + ")";
    if (ctx.scripts) {
      par += this.visit(ctx.scripts);
    }
    return par;
  }

  subExpr(ctx) {
    let result = ctx.literal[0].image;
    if (ctx.scripts) {
      result += this.visit(ctx.scripts);
    }
    return result;
  }
  
  scripts(ctx) {
    let result;
    if (ctx.subSup) {
      result = this.visit(ctx.subSup);
    } else {
      result = this.visit(ctx.supSub);
    }
    return result;
  }
  
  subSupScript(ctx) {
    let result = "_{" + this.visit(ctx.cov) + "}";
    if (ctx.contra) {
      result += "^{" + this.visit(ctx.contra) + "}";
    }
    return result;
  }

  supSubScript(ctx) {
    let result = "^{" + this.visit(ctx.contra) + "}";
    if (ctx.cov) {
      result += "_{" + this.visit(ctx.cov) + "}";
    }
    return result;
  }
  
  commaScriptExpression(ctx) {
    if (ctx.cov) {
      return this.visit(ctx.cov);
    } else {
      return this.visit(ctx.comma);
    }
  }

  commaInfixedExpression(ctx) {
    let result = this.visit(ctx.lhs);
    if (ctx.rhs) {
      result += ctx.diffop[0].image + this.visit(ctx.rhs);
    }
    return result
  }

  commaPrefixedExpression(ctx) {
    return ctx.diffop[0].image + this.visit(ctx.rhs);
  }

  indicesExpression(ctx) {
    const image = ctx.head[0].image;
    let result = image;
    if (this.indices.has(image)) {
      result = this.indicesMap[image];
    }
    if (ctx.tail) {
      result = result + " " + this.visit(ctx.tail);
    }
    return result;
  }
}

// for the playground to work the returned object must contain these field
//
//  return {
//    lexer: IndexorLexer,
//    parser: IndexorPure,
//    visitor: IndexorReplacer,
//    defaultRule: "expression"
//  }
//  }())
