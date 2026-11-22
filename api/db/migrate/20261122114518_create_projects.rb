class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.string :title, null: false
      t.json :data, null: false
      t.string :share_token, null: false
      t.integer :user_id

      t.timestamps
    end
    add_index :projects, :share_token, unique: true
    add_index :projects, :user_id
  end
end
