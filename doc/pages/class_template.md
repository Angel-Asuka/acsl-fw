> [Langley Document](../index.md) : [API Reference](./api.md) : Template

# Template class
## Description
Template 类描述了一个模板引擎对象， 提供基于 javascript 的模板渲染功能。
## Constructor
Template 类的构造方法原型如下：
```js
function Template(cfg);
```
其中，cfg 是一个对象，包含了对 App 的配置参数，详见下表：

| Key | Type | Description |
|-----|------|-------------|
|root|string|模板目录，Template 会在此目录中查找要求渲染的模板。|
|begin_mark|string|模板脚本起始标记，默认为 `<!--{`，详见模板说明。 |
|end_mark|string|模板脚本结束标记，默认为 `}-->`，详见模板说明 |

## Methods
| Method | Description |
|--------|-------------|
| [render](./class_template_render.md) | 渲染模板 |

## 模板说明
Template 所提供的模板引擎中所使用的模板脚本为 javascript。在模板文件中使用`<!--{` 和 `}-->` 来包裹模板脚本（这些标记可以在构造配置中修改）。模板脚本——即被模板标记包裹起来的内容——将会在渲染模板时被执行。与asp或者php类似，你可以在 HTML 中嵌入模板脚本，来根据需要调整要输出的 HTML 代码。 下面是一个简单的例子：

```html
<html>
<body>
    <p>Your name is <!--{print(data.name)}--></p>
</body>
</html>
```

上例中，被模板脚本包裹的 `print(data.name)` 将会在渲染改模板时被执行。 其中的 `print` 为 Template 内置函数，用于在模板脚本所在的位置输出内容。 `data` 是渲染函数 `render` 被调用时传入的数据参数。应用可以通过这个参数来向模板传递数据。假设上例中向 `render` 函数传递的 `data` 参数是这样的：

```js
render('1.html', {name: 'Langley'});
// 上面的代码向 render 中传递了这样的对象：
data = {
    name : 'Langley'
}
```

那么模板渲染出来的结果将会是：

```html
<html>
<body>
    <p>Your name is Langley</p>
</body>
</html>
```

### 流程控制
如大多数嵌入 HTML 的编程语言类似，你也可以通过 javascript 中的流程控制语句来控制模板渲染的行为, 例如：

```html
<p>
    <!--{for(let x of data.goods){          }-->
    <span><!--{print(x.name)}--></span>
    <!--{    if(x.count == 0){              }-->
        <span>SOLD OUT</span>
    <!--{    }else{                         }-->
        <span><!--{print(x.count)}--></span>
    <!--{    }                              }-->
    <!--{}                                  }-->
</p>
```

上例中通过 for 和 if 来控制模板渲染的行为，可以循环渲染一段模板，也可以根据需要控制要渲染或者不渲染哪些模板内容。需要注意的是，模板脚本采用的是完整的 `javascrip`， 上例等价于下面的 `javascript` 代码：

```js
print('<p>')
    for(let x of data.goods){
        print(`<span>${x.name}</span>`)
        if(x.count == 0){
            print(`<span>SOLD OUT</span>`)
        }else{
            print(`<span>${x.count}</span>`)
        }
    }
print('</p>')
```

### 便捷输出
除了 javascript，模板脚本还支持 `便捷输出` 标记，该标记可以方便地在代码中输出数据。

使用 `<!--{=` 和 `}-->` 来创建便捷输出标记。需要注意的是，如果你通过构造配置数据修改了起始和结束标记，那么这里也要跟着改成你所设定的内容（边界输出起始标记为 `起始标记` 后紧跟一个等号 “`=`”）。渲染时，会自动在相应的位置输出便捷输出标记内表达式的`值`。例如：

`<!--{="abc"}-->` 等价于 `<!--{print("abc")}-->`，将输出 `abc`，

而 `<!--{=1+2}>` 等价于 `<!--{print(1+2)}-->`，将输出 `3`。