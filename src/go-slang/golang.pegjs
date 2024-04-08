{{
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

  function anonymousSym() {
    var functionName = 'd' + Math.floor(Math.random()*1000001);
    return {
      tag: "nam",
      sym: functionName,
      type: null
    }
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

PlainIdentifier
  = !ReservedWord name:PlainIdentifierName { return name; }

PlainIdentifierName
  = head:IdentifierStart tail:IdentifierPart* {
      return {
        tag: "nam",
        sym: head + tail.join(""),
        type: "Null"
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
        case "WaitGroup":
          return "WaitGroup";
        case "Mutex":
          return "Mutex";
        case "chan":
          return "Channel"
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
    / "."

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
  / DeferToken
  / ChannelToken

Type
  = IntegerToken
  / BooleanToken
  / StringToken
  / WaitGroupToken
  / MutexToken
  / ChannelToken

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
  = literal:DecimalLiteral {
      return literal;
    }

DecimalLiteral
  = DecimalIntegerLiteral {
      return { tag: "lit", type: "Integer", val: parseFloat(text()) };
    }

DecimalIntegerLiteral
  = "0"
  / [1-9] [0-9]*

StringLiteral "string"
  = '"' chars:DoubleStringCharacter* '"' {
      return { tag: "lit", type: "String", val: chars.join("") };
    }
  / "'" chars:SingleStringCharacter* "'" {
      return { tag: "lit", type: "String", val: chars.join("") };
    }

DoubleStringCharacter
  = !'"' SourceCharacter { return text(); }

SingleStringCharacter
  = !"'" SourceCharacter { return text(); }

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
WaitGroupToken  = "WaitGroup"  !IdentifierPart
MutexToken      = "Mutex"      !IdentifierPart
DeferToken      = "defer"      !IdentifierPart
ChannelToken    = "chan"       !IdentifierPart

__
  = (WhiteSpace / LineTerminatorSequence)*

_
  = WhiteSpace*

EOS
  = __ ";"
  / _ LineTerminatorSequence

// ----- A.3 Expressions -----

PrimaryExpression
  = Identifier
  / Literal
  / ArrayLiteral

ArrayLiteral
  = "[]" Type "{" __ elements:ElementList __ "]" {
      return {
        type: "arr",
        elements: elements
      };
    }

ElementList
  = head:(
      element:AssignmentExpression {
        return [element];
      }
    )
    tail:(
      __ "," __ element:AssignmentExpression {
        return [element];
      }
    )*
    {return head.concat(tail)}

MemberExpression
  = head: Identifier "[" __ mem:Expression __ "]" {
    return {
      tag: "arrmem",
      arr: head,
      idx: mem
    }
  }

CallExpression
 = callee:Identifier __ args:Arguments {
      return { tag: "app", fun: callee, args: args };
    }

Arguments
  = "(" __ args:(ArgumentList __)? ")" {
      return optionalList(extractOptional(args, 0));
    }

ArgumentList
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return buildList(head, tail, 3);
    }

ChannelInitExpression
  = "make(" __ ChannelToken __ type:Type size:( __ "," __ AssignmentExpression)? ")" {
    return {
      tag: "app",
      fun: {
        "tag": "nam",
        "sym": `${type[0]}channel`,
        "type": "Null"
      },
      args: extractOptional(size, 3) == null ? [] : [extractOptional(size, 3)]
    }
  }

LeftHandSideExpression
  = ChannelInitExpression 
  / CallExpression
  / MemberExpression
  / PrimaryExpression

PostfixExpression
  = argument:LeftHandSideExpression _ operator:PostfixOperator {
    let binopSym = "+";
    if (operator == "--") {
      binopSym = "-"
    }
      return {
        tag: "assmt",
        op: "=",
        sym: argument,
        expr: {
          tag: "binop",
          sym: binopSym,
          first: argument,
          second: {
            "tag": "lit",
            "type": "Integer",
            "val": 1
          }
        }
      };
    }
  / LeftHandSideExpression

PostfixOperator
  = "++"
  / "--"

UnaryExpression
  = PostfixExpression
  / operator:UnaryOperator __ argument:UnaryExpression {
      return {
        tag: "unop",
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
  = $("+" !"=")
  / $("-" !"=")

RelationalExpression
  = head:AdditiveExpression
    tail:(__ RelationalOperator __ AdditiveExpression)*
    { return buildBinaryExpression(head, tail); }

RelationalOperator
  = "<="
  / ">="
  / $("<" !"<")
  / $(">" !">")

EqualityExpression
  = head:RelationalExpression
    tail:(__ EqualityOperator __ RelationalExpression)*
    { return buildBinaryExpression(head, tail); }

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

ReceiveChannelExpression
 = "<-" __ id:Identifier {
  return { tag: "receiveCh", sym: id}
 }

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
        op: "=",
        sym: left,
        expr: {
          tag: "binop",
          sym: operator.substring(0, 1),
          first: left,
          second: right
        }
      };
    }
  / ConditionalExpression
  / ReceiveChannelExpression

AssignmentOperator
  = "*="
  / "/="
  / "%="
  / "+="
  / "-="

Expression
  = head:AssignmentExpression {
      return head;
    }

// ----- A.4 Statements -----

Statement
  = SendChannelStatement
  / BlockStatement
  / VariableStatement
  / ConstantStatement
  / EmptyStatement
  / ExpressionStatement
  / IfStatement
  / WhileStatement
  / ForStatement
  / ContinueStatement
  / BreakStatement
  / ReturnStatement
  / GoroutineStatement
  / FunctionDeclaration
  / AnonymousFunction
  / DeferStatement

BlockStatement
  = "{" __ body:(StatementList __)? "}" {
      return {
        tag: "blkseq",
        body: optionalList(extractOptional(body, 0))
      };
    }

StatementList
  = head:Statement tail:(__ Statement)* { return buildList(head, tail, 1); }

VariableStatement
    = VarToken __ ids:VariableList __ type:InitType __ inits:InitialiserList {
      if (ids.length != inits.length) {
        error("different number of variables and expressions")
      }

      const assmts = []

      for (let i = 0; i < ids.length; i++) {
        assmts.push(
          {
            tag: "var",
            sym: ids[i],
            type: type,
            expr: inits[i]
          }
        )
      }

      return {
        tag: "blkseq",
        body: assmts
      }
    }
    / VarToken __ ids:VariableList __ type:InitType {
      return ids.map(id => {
        id.type = type
        return id
      })
    }
    / VarToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser)? {
        return {
            tag: "var",
            sym: id,
            type: type,
            expr: extractOptional(init, 1)
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser) {
        return {
            tag: "var",
            sym: id,
            expr: extractOptional(init, 1)
        }
    }
    
VariableList
  = head:PlainIdentifier tail:(__ "," __ PlainIdentifier)+ {
      return buildList(head, tail, 3);
    }

ConstantStatement
    = ConstToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser) {
        return {
            tag: "const",
            sym: id,
            type: type,
            expr: extractOptional(init, 1)
        }
    }

InitialiserList
  = "=" !"=" __ head:AssignmentExpression tail:(__ "," __ AssignmentExpression)+ {
      return buildList(head, tail, 3);
    }

Initialiser
  = "=" !"=" __ expression:AssignmentExpression { return expression; }

ShorthandInitialiser
  = ":=" __ expression:AssignmentExpression { return expression; }

EmptyStatement
  = ";" { return { tag: "empty" }; }

ExpressionStatement
  = !("{" / FunctionToken) expression:Expression EOS { return expression; }

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

ForStatement
  = ForToken __ test:Expression __
  body:Statement
  { return { tag: "while", pred: test, body: body }; }
  / ForToken __ init:VariableStatement __ ";" __ test:Expression __ ";" __ update:AssignmentExpression __
  body:Statement
  {return {tag:"for", init: init, pred: test, body: body, update: update} }

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
  / ReturnToken __ argument:Expression EOS {
      return { tag: "ret", expr: argument };
    }

DeferStatement
  = DeferToken __ argument:Expression EOS {
      return { tag: "def", expr: argument };
    }

GoroutineStatement
  = GoroutineToken __ argument:CallExpression EOS {
      return { tag: "goroutine", expr: argument }
    }
  / GoroutineToken __ expr:AnonymousFunction EOS {
      const call = expr.body[1]
      expr.body[1] = { tag: "goroutine", expr: call }
      return expr
    }

SendChannelStatement
  = id:Identifier __ "<-" __ expr: Expression {
    return { tag: "sendCh", sym: id, expr: expr }
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
  / AnonymousFunction

AnonymousFunction
  = FunctionToken __
    "(" __ params:(FormalParameterList __)? ")" __
    type:(InitType)? __
    "{" __ body:FunctionBody __ "}"
    __ args:Arguments
    {
      const sym = anonymousSym()
      return {
        tag: "blkseq",
        body: [
          {
            tag: "func",
            sym: sym,
            prms: optionalList(extractOptional(params, 0)),
            type: type,
            body: body
          },
          {
            tag:"app",
            fun: sym,
            args: args
          }
        ]
          
      }
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
        tag: "blkseq",
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
