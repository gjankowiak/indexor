//(function latexExampleCst() {
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

const NumberLiteral = createToken({name: "NumberLiteral", pattern: /[1-9]\d*/});
const AlphaLiteral = createToken({name: "AlphaLiteral", pattern: /\\?[a-zA-Z]+/});
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
  Fraction,
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
      {ALT: () => $.CONSUME(NumberLiteral)},
      {ALT: () => $.SUBRULE($.fraction)},
      {ALT: () => $.SUBRULE($.supScriptedExpression)}
    ]));

    $.RULE("fraction", () => {
      $.CONSUME(Fraction)
      $.CONSUME(LBracket);
      $.CONSUME(NumberLiteral, {LABEL: "num"})
      $.CONSUME(RBracket);
      $.CONSUME2(LBracket);
      $.CONSUME2(NumberLiteral, {LABEL: "denom"})
      $.CONSUME2(RBracket);
    })

    $.RULE("parenthesisExpression", () => {
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
    });

    $.RULE("subScriptedExpression", () => {
      $.CONSUME(AlphaLiteral, {LABEL: "literal"});
      $.OPTION(() => {
        $.CONSUME(SubScript);
        $.CONSUME(LBracket);
        $.SUBRULE2($.commaScriptExpression, {LABEL: "cov"});
        $.CONSUME(RBracket);
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

    $.RULE("supScriptedExpression", () => {
      $.SUBRULE($.subScriptedExpression, {LABEL: "lower"});
      $.OPTION(() => {
        $.CONSUME(SupScript);
        $.CONSUME(LBracket);
        $.SUBRULE2($.indicesExpression, {LABEL: "contra"});
        $.CONSUME(RBracket);
      });
    });

    $.RULE("indicesExpression", () => {
      $.CONSUME(AlphaLiteral, {LABEL: "head"});
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
    else if (ctx.NumberLiteral) {
      // If a key exists on the ctx, at least one element is guaranteed
      return { cov: new Set([]), contra: new Set([]), ein: new Set([]), errors: new Set([]) }
    }
    else if (ctx.fraction) {
      return this.visit(ctx.fraction)
    }
    else if (ctx.supScriptedExpression) {
      return this.visit(ctx.supScriptedExpression)
    }
  }

  fraction(ctx) {
    return { cov: new Set([]), contra: new Set([]), ein: new Set([]), errors: new Set([]) }
  }

  parenthesisExpression(ctx) {
    // The ctx will also contain the parenthesis tokens, but we don't care about those
    // in the context of calculating the result.
    return this.visit(ctx.expression);
  }

  subScriptedExpression(ctx) {
    let image = ctx.literal[0].image;
    if (ctx.cov) {
      const result_cov = this.visit(ctx.cov, image);
      return result_cov;
    } else {
      return {idx: new Set([]), errors: new Set([]), image:image};
    }
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

  supScriptedExpression(ctx) {
    let result_lower = this.visit(ctx.lower);
    let result_upper;
    if (ctx.contra) {
      result_upper = this.visit(ctx.contra, result_lower.image);
    } else {
      result_upper = {idx: new Set([]), errors: new Set([])};
    }

    // check for repeated indices
    let ein = intersection(result_lower.idx, result_upper.idx);
    ein.forEach((idc) => {
      result_lower.idx.delete(idc);
      result_upper.idx.delete(idc);
    });

    const result = {
      cov: result_lower.idx,
      contra: result_upper.idx,
      ein: ein,
      errors: union(result_lower.errors, result_upper.errors)
    };

    return result
  }

  indicesExpression(ctx, image) {
    const current_idx = ctx.head[0].image;
    if (ctx.tail) {
      const tailResult = this.visit(ctx.tail, image);
      if (!tailResult.idx.has(current_idx)) {
        tailResult.idx.add(current_idx);
      } else {
        tailResult.errors.add("index '" + current_idx + "' appears twice at the same level of " + image);
      }
      return tailResult;
    } else {
      return {idx: new Set([current_idx]), errors: new Set([])};
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

    return result
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
    } else if (ctx.NumberLiteral) {
      // If a key exists on the ctx, at least one element is guaranteed
      return ctx.NumberLiteral[0].image;
    } else if (ctx.fraction) {
      // If a key exists on the ctx, at least one element is guaranteed
      return this.visit(ctx.fraction);
    } else if (ctx.supScriptedExpression) {
      return this.visit(ctx.supScriptedExpression)
    }
  }

  fraction(ctx) {
    return "\\frac{" + ctx.num[0].image + "}{" + ctx.denom[0].image + "}";
  }

  parenthesisExpression(ctx) {
    // The ctx will also contain the parenthesis tokens, but we don't care about those
    // in the context of calculating the result.
    return "(" + this.visit(ctx.expression) + ")";
  }

  subScriptedExpression(ctx) {
    let result = ctx.literal[0].image;
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

  supScriptedExpression(ctx) {
    let result = this.visit(ctx.lower);

    if (ctx.contra) {
      result += "^{" + this.visit(ctx.contra) + "}";
    }

    return result
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

// for the playground to work the returned object must contain these fields

// return {
//   lexer: IndexorLexer,
//   parser: IndexorPure,
//   visitor: IndexorReplacer,
//   //visitor: IndexorInterpreter,
//   defaultRule: "expression"
// }
// }())
