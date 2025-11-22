import { supabase } from 'supabaseClient'



async function fetchThoughts() {
  const { data, error } = await supabase
    .from('thoughts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching thoughts:', error)
    return []
  }

  return data
}

fetchThoughts().then(thoughts => console.log(thoughts))

async function addThought(text) {
  const { data, error } = await supabase
    .from('thoughts')
    .insert([{ content: text }])

  if (error) {
    console.error('Error adding thought:', error)
    return null
  }

  return data
}

addThought("My first random thought 😎").then(console.log)


