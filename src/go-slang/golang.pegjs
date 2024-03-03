{{
  var TYPES_TO_PROPERTY_NAMES = {
    CallExpression:   "callee",
    MemberExpression: "object",
  };

  function filledArray(count, value) {
    return Array.apply(null, new Array(count))
      .map(function() { return value; });
  }

  function extractOptional(optional, index) {
    return optional ? optional[index] : null;
  }

  function extractList(list, index) {
    return list.map(function(element) { return element[index]; });
  }

  function buildList(head, tail, index) {
    return [head].concat(extractList(tail, index));
  }

  function buildBinaryExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        tag: "binop",
        sym: element[1],
        first: result,
        second: element[3]
      };
    }, head);
  }

  function buildLogicalExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        tag: "log",
        sym: element[1],
        first: result,
        second: element[3]
      };
    }, head);
  }

  function optionalList(value) {
    return value !== null ? value : [];
  }
}}

Start
  = __ program:Program __ { return program; }

// ----- A.1 Lexical Grammar -----

SourceCharacter
  = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"

Identifier
  = !ReservedWord name:IdentifierName { return name; }

IdentifierName "Name"
  = head:IdentifierStart tail:IdentifierPart* type:(__ InitType)?{
      return {
        tag: "nam",
        sym: head + tail.join(""),
        type: extractOptional(type, 1) ? extractOptional(type, 1) : "Null"
      };
    }

InitType
  = type:Type { 
      switch(type[0]) {
        case "int":
          return "Integer";
        case "bool":
          return "Boolean";
        case "string":
          return "String";
        default:
          return "Null";
      } 
    }

IdentifierStart
    = [a-zA-Z]

IdentifierPart
    = [a-zA-Z0-9]
    / "_"
    / "-"

ReservedWord
  = Keyword
  / NullLiteral
  / BooleanLiteral

Keyword
  = BreakToken
  / ContinueToken
  / ElseToken
  / ForToken
  / FunctionToken
  / IfToken
  / ReturnToken
  / ThisToken
  / VarToken
  / WhileToken
  / ConstToken
  / IntegerToken
  / BooleanToken
  / StringToken
  / GoroutineToken

Type
  = IntegerToken
  / BooleanToken
  / StringToken

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

NullLiteral
  = NullToken { return { tag: "lit", type: "Null", val: null }; }

BooleanLiteral
  = TrueToken  { return { tag: "lit", type: "Boolean", val: true  }; }
  / FalseToken { return { tag: "lit", type: "Boolean", val: false }; }

NumericLiteral "number"
  = literal:DecimalLiteral !(IdentifierStart / DecimalDigit) {
      return literal;
    }

DecimalLiteral
  = DecimalIntegerLiteral {
      return { tag: "lit", type: "Integer", val: parseFloat(text()) };
    }

DecimalIntegerLiteral
  = "0"
  / NonZeroDigit DecimalDigit*

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

StringLiteral "string"
  = '"' chars:DoubleStringCharacter* '"' {
      return { tag: "lit", type: "String", val: chars.join("") };
    }
  / "'" chars:SingleStringCharacter* "'" {
      return { tag: "lit", type: "String", val: chars.join("") };
    }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation

SingleStringCharacter
  = !("'" / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation

LineContinuation
  = "\\" LineTerminatorSequence { return ""; }

EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit { return "\0"; }

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = "'"
  / '"'
  / "\\"
  / "b"  { return "\b"; }
  / "f"  { return "\f"; }
  / "n"  { return "\n"; }
  / "r"  { return "\r"; }
  / "t"  { return "\t"; }
  / "v"  { return "\v"; }

NonEscapeCharacter
  = !(EscapeCharacter / LineTerminator) SourceCharacter { return text(); }

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

// Tokens

BreakToken      = "break"      !IdentifierPart
ConstToken      = "const"      !IdentifierPart
ContinueToken   = "continue"   !IdentifierPart
ElseToken       = "else"       !IdentifierPart
FalseToken      = "false"      !IdentifierPart
ForToken        = "for"        !IdentifierPart
FunctionToken   = "func"       !IdentifierPart
IfToken         = "if"         !IdentifierPart
NullToken       = "nil"        !IdentifierPart
ReturnToken     = "return"     !IdentifierPart
ThisToken       = "this"       !IdentifierPart
TrueToken       = "true"       !IdentifierPart
VarToken        = "var"        !IdentifierPart
WhileToken      = "while"      !IdentifierPart
IntegerToken    = "int"        !IdentifierPart
BooleanToken    = "bool"       !IdentifierPart
StringToken     = "string"     !IdentifierPart
GoroutineToken  = "go"         !IdentifierPart

__
  = (WhiteSpace / LineTerminatorSequence)*

_
  = WhiteSpace*

// Automatic Semicolon Insertion

EOS
  = __ ";"
  / _ LineTerminatorSequence
  / _ &"}"
  / __ EOF

EOF
  = !.

// ----- A.3 Expressions -----

PrimaryExpression
  = Identifier
  / Literal
  / ArrayLiteral
  / "(" __ expression:Expression __ ")" { return expression; }

ArrayLiteral
  = "[" __ elision:(Elision __)? "]" {
      return {
        type: "ArrayExpression",
        elements: optionalList(extractOptional(elision, 0))
      };
    }
  / "[" __ elements:ElementList __ "]" {
      return {
        type: "ArrayExpression",
        elements: elements
      };
    }
  / "[" __ elements:ElementList __ "," __ elision:(Elision __)? "]" {
      return {
        type: "ArrayExpression",
        elements: elements.concat(optionalList(extractOptional(elision, 0)))
      };
    }

ElementList
  = head:(
      elision:(Elision __)? element:AssignmentExpression {
        return optionalList(extractOptional(elision, 0)).concat(element);
      }
    )
    tail:(
      __ "," __ elision:(Elision __)? element:AssignmentExpression {
        return optionalList(extractOptional(elision, 0)).concat(element);
      }
    )*
    { return Array.prototype.concat.apply(head, tail); }

Elision
  = "," commas:(__ ",")* { return filledArray(commas.length + 1, null); }

MemberExpression
  = head:(
        PrimaryExpression
      / FunctionExpression
    )
    tail:(
        __ "[" __ property:Expression __ "]" {
          return { property: property, computed: true };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        return {
          tag: "MemberExpression",
          object: result,
          property: element.property,
          computed: element.computed
        };
      }, head);
    }

NewExpression
  = MemberExpression

CallExpression
  = head:(
      callee:MemberExpression __ args:Arguments {
        return { tag: "app", fun: callee, args: args };
      }
    )
    tail:(
        __ args:Arguments {
          return { tag: "app", fun: args };
        }
      / __ "[" __ property:Expression __ "]" {
          return {
            tag: "MemberExpression",
            property: property,
            computed: true
          };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;

        return element;
      }, head);
    }

Arguments
  = "(" __ args:(ArgumentList __)? ")" {
      return optionalList(extractOptional(args, 0));
    }

ArgumentList
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return buildList(head, tail, 3);
    }

LeftHandSideExpression
  = CallExpression
  / NewExpression

PostfixExpression
  = LeftHandSideExpression

UnaryExpression
  = PostfixExpression
  / operator:UnaryOperator __ argument:UnaryExpression {
      var type = (operator === "++" || operator === "--")
        ? "UpdateExpression"
        : "unop";

      return {
        tag: type,
        sym: operator,
        arg: argument,
        prefix: true
      };
    }

UnaryOperator
  = $("-" !"=")
  / "!"

MultiplicativeExpression
  = head:UnaryExpression
    tail:(__ MultiplicativeOperator __ MultiplicativeExpression)*
    { return buildBinaryExpression(head, tail); }

MultiplicativeOperator
  = $("*" !"=")
  / $("/" !"=")
  / $("%" !"=")

AdditiveExpression
  = head:MultiplicativeExpression
    tail:(__ AdditiveOperator __ MultiplicativeExpression)*
    { return buildBinaryExpression(head, tail); }

AdditiveOperator
  = $("+" ![+=])
  / $("-" ![-=])

RelationalExpression
  = head:AdditiveExpression
    tail:(__ RelationalOperator __ AdditiveExpression)*
    { return buildLogicalExpression(head, tail); }

RelationalOperator
  = "<="
  / ">="
  / $("<" !"<")
  / $(">" !">")

EqualityExpression
  = head:RelationalExpression
    tail:(__ EqualityOperator __ RelationalExpression)*
    { return buildLogicalExpression(head, tail); }

EqualityOperator
  = "=="
  / "!="

LogicalANDExpression
  = head:EqualityExpression
    tail:(__ LogicalANDOperator __ EqualityExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalANDOperator
  = "&&"

LogicalORExpression
  = head:LogicalANDExpression
    tail:(__ LogicalOROperator __ LogicalANDExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalOROperator
  = "||"

ConditionalExpression
  = LogicalORExpression

AssignmentExpression
  = left:LeftHandSideExpression __
    "=" !"=" __
    right:AssignmentExpression
    {
      return {
        tag: "assmt",
        op: "=",
        sym: left,
        expr: right
      };
    }
  / left:LeftHandSideExpression __
    operator:AssignmentOperator __
    right:AssignmentExpression
    {
      return {
        tag: "assmt",
        op: operator,
        sym: left,
        expr: right
      };
    }
  / ConditionalExpression

AssignmentOperator
  = "*="
  / "/="
  / "%="
  / "+="
  / "-="

Expression
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return tail.length > 0
        ? { tag: "SequenceExpression", expressions: buildList(head, tail, 3) }
        : head;
    }

// ----- A.4 Statements -----

Statement
  = BlockStatement
  / VariableStatement
  / ConstantStatement
  / EmptyStatement
  / ExpressionStatement
  / IfStatement
  / WhileStatement
  / ContinueStatement
  / BreakStatement
  / ReturnStatement
  / GoroutineStatement

BlockStatement
  = "{" __ body:(StatementList __)? "}" {
      return {
        tag: "blk",
        body: optionalList(extractOptional(body, 0))
      };
    }

StatementList
  = head:Statement tail:(__ Statement)* { return buildList(head, tail, 1); }

VariableStatement
    = VarToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser)? EOS {
        return {
            tag: "var",
            sym: id,
            type: type,
            expr: extractOptional(init, 1)
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser) EOS {
        return {
            tag: "var",
            sym: id,
            expr: extractOptional(init, 1)
        }
    }

ConstantStatement
    = ConstToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser) EOS {
        return {
            tag: "const",
            sym: id,
            type: type,
            expr: extractOptional(init, 1)
        }
    }

Initialiser
  = "=" !"=" __ expression:AssignmentExpression { return expression; }

ShorthandInitialiser
  = ":=" __ expression:AssignmentExpression { return expression; }

EmptyStatement
  = ";" { return { tag: "empty" }; }

ExpressionStatement
  = !("{" / FunctionToken) expression:Expression EOS {
    return expression;
      // return {
      //   type: "ExpressionStatement",
      //   expression: expression
      // };
    }

IfStatement
  = IfToken __ test:Expression __
    consequent:Statement __
    ElseToken __
    alternate:Statement
    {
      return {
        tag: "cond",
        pred: test,
        cons: consequent,
        alt: alternate
      };
    }
  / IfToken __ test:Expression __
    consequent:Statement {
      return {
        tag: "cond",
        pred: test,
        cons: consequent,
        alt: null
      };
    }

WhileStatement
  = WhileToken __ test:Expression __
    body:Statement
    { return { tag: "while", pred: test, body: body }; }

ContinueStatement
  = ContinueToken EOS {
      return { tag: "continue", label: null };
    }
  / ContinueToken _ label:Identifier EOS {
      return { tag: "continue", label: label };
    }

BreakStatement
  = BreakToken EOS {
      return { tag: "break", label: null };
    }
  / BreakToken _ label:Identifier EOS {
      return { tag: "break", label: label };
    }

ReturnStatement
  = ReturnToken EOS {
      return { tag: "ret", expr: null };
    }
  / ReturnToken _ argument:Expression EOS {
      return { tag: "ret", expr: argument };
    }

GoroutineStatement
  = GoroutineToken _ argument:CallExpression EOS {
      return { tag: "goroutine", expr: argument }
    }

// ----- A.5 Functions and Programs -----

FunctionDeclaration
  = FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    type:(InitType)? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "func",
        sym: id,
        prms: optionalList(extractOptional(params, 0)),
        type: type,
        body: body
      };
    }
  / FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    "(" __ type:(ReturnTypeList) __ ")" __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "func",
        sym: id,
        prms: optionalList(extractOptional(params, 0)),
        type: type,
        body: body
      };
    }

FunctionExpression
  = FunctionToken __ id:(Identifier __)?
    "(" __ params:(FormalParameterList __)? ")" __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "func",
        sym: extractOptional(id, 0),
        prms: optionalList(extractOptional(params, 0)),
        body: body
      };
    }

FormalParameterList
  = head:Identifier tail:(__ "," __ Identifier)* {
      return buildList(head, tail, 3);
    }

ReturnTypeList
  = head:InitType tail:(__ "," __ InitType)* {
    return buildList(head, tail, 3);
  }

FunctionBody
  = body:SourceElements? {
      return {
        tag: "blk",
        body: optionalList(body)
      };
    }

Program
  = body:SourceElements? {
      return optionalList(body);
    }

SourceElements
  = head:SourceElement tail:(__ SourceElement)* {
      return buildList(head, tail, 1);
    }

SourceElement
  = Statement
  / FunctionDeclaration