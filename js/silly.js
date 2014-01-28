var Silly, _;

Silly = (function() {
  Silly.getSelection = function(container) {
    var build, common_ancestor, end, eqNodes, range, sel, start;
    sel = rangy.getSelection();
    if (!sel.rangeCount) {
      throw new Error("No selection made.");
    }
    range = sel.getRangeAt(0);
    if (range.isCollapsed) {
      throw new Error("Selection is empty.");
    }
    build = function(name) {
      return {
        node: range[name + "Container"],
        offset: range[name + "Offset"]
      };
    };
    start = build("start");
    end = build("end");
    eqNodes = _.isEqual(start.node, end.node);
    if (!($.contains(container, start.node) && $.contains(container, end.node))) {
      throw new Error("Selection is not within the container bounds.");
    }
    if (eqNodes) {
      common_ancestor = start.node.parentElement;
    } else {
      common_ancestor = rangy.dom.getCommonAncestor(start.node, end.node);
    }
    if (!eqNodes) {
      start.node = rangy.dom.getClosestAncestorIn(start.node, common_ancestor, true);
      end.node = rangy.dom.getClosestAncestorIn(end.node, common_ancestor, true);
      if (start.node.nodeType !== 3) {
        start.offset = -1;
      }
      if (end.node.nodeType !== 3) {
        end.offset = -1;
      }
    }
    return {
      start: start,
      end: end,
      parent: common_ancestor
    };
  };

  Silly.nodeToSelection = function(container, node, offset, length) {
    var curr, node_index, parents;
    if (!$.contains(container, node)) {
      throw new Error("Node is not within container.");
    }
    if (!(_.isObject(node) && node.nodeType === 3)) {
      throw new Error("Only text nodes can be converted to selections.");
    }
    curr = node.parentNode;
    parents = [];
    while (_.isObject(curr) && !$(curr).is(container)) {
      parents.unshift(Silly.getNodeIndex(curr));
      curr = curr.parentNode;
    }
    node_index = Silly.getNodeIndex(node);
    return new Silly(container, {
      s: [node_index, offset],
      e: [node_index, offset + length],
      p: parents
    });
  };

  Silly.getNodeIndex = function(node) {
    var parent;
    parent = node.parentNode;
    if (parent != null) {
      return $(parent).contents().index(node);
    } else {
      return 0;
    }
  };

  function Silly(container, selection) {
    this.container = container;
    if (_.isObject(selection)) {
      this.deserialize(selection);
    } else {
      this.selection = Silly.getSelection(this.container);
    }
  }

  Silly.prototype.getNodes = function() {
    var end, nodes, sel, start;
    sel = this.selection;
    nodes = sel.parent.childNodes;
    start = Silly.getNodeIndex(sel.start.node);
    end = Silly.getNodeIndex(sel.end.node);
    return Array.prototype.slice.call(nodes, start, end + 1);
  };

  Silly.prototype.find = function(el) {
    var els, nodes, sel;
    sel = this.selection;
    nodes = this.getNodes();
    els = $([]);
    _.each(nodes, function(n) {
      if (n.nodeType === 1) {
        if ($(n).is(el)) {
          els = els.add(n);
        }
        return els = els.add($(n).find(el));
      }
    });
    return els;
  };

  Silly.prototype.wrap = function(html) {
    var endel, nodes, nstart, sel, startel;
    sel = this.selection;
    nodes = this.getNodes();
    if (sel.end.offset >= 0) {
      endel = nodes.pop();
      endel.splitText(sel.end.offset);
      nodes.push(endel);
    }
    if (sel.start.offset >= 0) {
      startel = nodes.shift();
      nstart = startel.splitText(sel.start.offset);
      nodes.unshift(nstart);
    }
    return $(nodes).wrapAll(html).parent();
  };

  Silly.prototype.unwrap = function(wrapel) {
    var parent;
    parent = wrapel.parent();
    wrapel.contents().unwrap();
    return parent[0].normalize();
  };

  Silly.prototype.html = function() {
    var html, wrapel;
    wrapel = this.wrap("<span>");
    html = wrapel.html();
    this.unwrap(wrapel);
    return html;
  };

  Silly.prototype.toString = function() {
    return this.html();
  };

  Silly.prototype.serialize = function() {
    var curr, end, parents, sel, start;
    sel = this.selection;
    parents = [];
    curr = $(sel.parent);
    while (!curr.is(this.container)) {
      parents.unshift(Silly.getNodeIndex(curr[0]));
      curr = curr.parent();
    }
    start = [Silly.getNodeIndex(sel.start.node), sel.start.offset];
    end = [Silly.getNodeIndex(sel.end.node), sel.end.offset];
    return {
      p: parents,
      s: start,
      e: end
    };
  };

  Silly.prototype.deserialize = function(obj) {
    var cur, els, end, end_el, start, start_el, _ref, _ref1;
    if (!_.isArray(obj.p)) {
      throw new Error("Expecting array with parent indexes.");
    }
    if (!(_.isArray(obj.s) && obj.s.length >= 2)) {
      throw new Error("Expecting array with start node index and offset.");
    }
    if (!(_.isArray(obj.e) && obj.e.length >= 2)) {
      throw new Error("Expecting array with end node index and offset.");
    }
    cur = $(this.container);
    _.each(obj.p, function(i) {
      var nel;
      nel = cur.contents().eq(i);
      if (!nel.length) {
        throw new Error("Invalid selection. Bad parents.");
      }
      return cur = nel;
    });
    els = cur.contents();
    start_el = els.eq(obj.s[0]);
    end_el = els.eq(obj.e[0]);
    if (!start_el.length) {
      throw new Error("Invalid selection. Missing start element.");
    }
    if (!end_el.length) {
      throw new Error("Invalid selection. Missing end elements.");
    }
    start = {
      node: start_el[0],
      offset: obj.s[1]
    };
    end = {
      node: end_el[0],
      offset: obj.e[1]
    };
    if (start.node.nodeType === 3) {
      if (!((0 <= (_ref = start.offset) && _ref <= start.node.nodeValue.length))) {
        throw new Error("Start offset is out of bounds.");
      }
    } else if (start.offset > -1) {
      throw new Error("Start element should be a text node.");
    }
    if (end.node.nodeType === 3) {
      if (!((0 <= (_ref1 = end.offset) && _ref1 <= end.node.nodeValue.length))) {
        throw new Error("End offset is out of bounds.");
      }
    } else if (end.offset > -1) {
      throw new Error("End element should be a text node.");
    }
    return this.selection = {
      start: start,
      end: end,
      parent: cur[0]
    };
  };

  Silly.prototype.toJSON = function() {
    return this.serialize();
  };

  return Silly;

})();

module.exports = Silly;