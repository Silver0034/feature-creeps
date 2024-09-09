---
title: 'Add Feature'
key: 2
---

<header>
    <h1>Add your Feature:</h1>
</header>
<form id='addFeature'>
    <label for='addFeatureInput'>Write a feature</label>
    <input id='addFeatureInput' name='addFeatureInput' />
    <button type='submit'>Add</button>
</form>

<script>
    function handleAddFeatureSubmit(event) {
        const target = event.target
        if (!target || target?.closest('#addFeature') === null) return

        event.preventDefault()

        const value = target.querySelector('input').value

        console.log('Form value: ', value)

        // TODO: do something with the form data
    }

    document.addEventListener('submit', handleAddFeatureSubmit)
</script>
