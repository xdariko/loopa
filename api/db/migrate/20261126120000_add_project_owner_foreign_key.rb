class AddProjectOwnerForeignKey < ActiveRecord::Migration[8.1]
  def change
    add_foreign_key :projects, :users
  end
end
